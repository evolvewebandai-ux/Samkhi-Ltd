import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { COLLECTIONS } from '../data';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// Rule evaluator helper for automated collections
export function matchProductToRules(product: any, ruleSet: any): boolean {
  if (!ruleSet || !ruleSet.conditions || ruleSet.conditions.length === 0) return false;
  
  const results = ruleSet.conditions.map((cond: any) => {
    let prodValue = "";
    if (cond.field === 'title') prodValue = product.name || "";
    else if (cond.field === 'tag') {
      const tags = product.tags || [];
      const val = cond.value?.toLowerCase() || "";
      if (cond.operator === 'equals') return tags.some((t: string) => t.toLowerCase() === val);
      if (cond.operator === 'not_equals') return !tags.some((t: string) => t.toLowerCase() === val);
      if (cond.operator === 'contains') return tags.some((t: string) => t.toLowerCase().includes(val));
      if (cond.operator === 'not_contains') return !tags.some((t: string) => t.toLowerCase().includes(val));
      return false;
    }
    else if (cond.field === 'type') {
      const tags = product.tags || [];
      return tags.some((t: string) => t.toLowerCase() === (cond.value || "").toLowerCase());
    }
    else if (cond.field === 'vendor') prodValue = product.brand || "";
    else if (cond.field === 'price') {
      const pPrice = Number(product.price) || 0;
      const cValue = Number(cond.value) || 0;
      if (cond.operator === 'equals') return pPrice === cValue;
      if (cond.operator === 'not_equals') return pPrice !== cValue;
      if (cond.operator === 'greater_than') return pPrice > cValue;
      if (cond.operator === 'less_than') return pPrice < cValue;
      return false;
    }

    const testVal = String(prodValue).toLowerCase();
    const condVal = String(cond.value).toLowerCase();

    switch (cond.operator) {
      case 'equals': return testVal === condVal;
      case 'not_equals': return testVal !== condVal;
      case 'contains': return testVal.includes(condVal);
      case 'not_contains': return !testVal.includes(condVal);
      case 'starts_with': return testVal.startsWith(condVal);
      case 'ends_with': return testVal.endsWith(condVal);
      case 'greater_than': return Number(prodValue) > Number(cond.value);
      case 'less_than': return Number(prodValue) < Number(cond.value);
      default: return false;
    }
  });

  if (ruleSet.match === 'any') {
    return results.some(r => r === true);
  } else {
    return results.every(r => r === true);
  }
}

export default function Shop() {
  const { products } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val) {
      searchParams.set('q', val);
    } else {
      searchParams.delete('q');
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Dynamic Collections Sync from Firestore
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionProducts, setCollectionProducts] = useState<any[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);

  useEffect(() => {
    const unsubColl = onSnapshot(collection(db, 'collections'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setCollections(list.length > 0 ? list : COLLECTIONS);
      setLoadingCollections(false);
    }, (error) => {
      console.warn("Unable to fetch collections, falling back to seed data", error);
      setCollections(COLLECTIONS);
      setLoadingCollections(false);
    });

    const unsubLinks = onSnapshot(collection(db, 'collection_products'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setCollectionProducts(list);
    }, (error) => {
      console.warn("Unable to fetch collection products mapping:", error);
    });

    return () => {
      unsubColl();
      unsubLinks();
    };
  }, []);

  const activeCollection = searchParams.get('collection') || 'all';

  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeCollection !== 'all') {
      const col = collections.find(c => c.id === activeCollection);
      if (col) {
        const type = col.collection_type || col.type;
        if (type === 'automated') {
          const ruleSet = col.rule_set || { conditions: col.conditions || [], match: col.conditionOperator || 'all' };
          result = result.filter(p => matchProductToRules(p, ruleSet));
        } else {
          const mappedProductIds = collectionProducts
            .filter((link: any) => link.collection_id === col.id)
            .map((link: any) => link.product_id);
          result = result.filter(p => mappedProductIds.includes(p.id));
        }
      } else {
        // Fallback or custom matching
        result = result.filter(p => p.tags?.some(t => t.toLowerCase() === activeCollection.toLowerCase()));
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter(p => p.price >= min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter(p => p.price <= max);
      }
    }

    if (sortBy === 'price-low') result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') result = [...result].sort((a, b) => b.price - a.price);

    return result;
  }, [products, collections, collectionProducts, activeCollection, searchQuery, sortBy, minPrice, maxPrice]);

  const handleCollectionChange = (collId: string) => {
    if (collId === 'all') {
      searchParams.delete('collection');
    } else {
      searchParams.set('collection', collId);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="bg-secondary text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-display font-black mb-4">Inventory Catalogue</h1>
          <p className="text-slate-400 max-w-2xl">Browse our high-performance LED lighting and solar solutions. Real-time stock availability for professionals and homeowners.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters */}
          <aside className="lg:w-64 space-y-8 hidden lg:block">
            <div>
              <h3 className="text-sm font-black text-secondary uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Collections</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => handleCollectionChange('all')}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                    activeCollection === 'all' ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  All Products
                </button>
                {collections.map(col => (
                  <button 
                    key={col.id}
                    onClick={() => handleCollectionChange(col.id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                      activeCollection === col.id ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    {col.title}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-secondary uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Price Range</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400">Min ($)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400">Max ($)</label>
                  <input 
                    type="number" 
                    placeholder="50000"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-secondary uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Technical Specs</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 accent-primary" />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-primary">In Stock Only</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 accent-primary" />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-primary">Energy Star Rated</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 accent-primary" />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-primary">Warranty Included</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Sort Toolbar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Search by name, SKU, or keyword..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  <select 
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-10 outline-none text-sm font-bold text-secondary focus:border-primary transition-all pr-12 cursor-pointer"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="price-low">Sort: Price Low to High</option>
                    <option value="price-high">Sort: Price High to Low</option>
                    <option value="popular">Sort: Most Popular</option>
                  </select>
                </div>

                <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-primary shadow-sm" : "text-slate-400")}
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-primary shadow-sm" : "text-slate-400")}
                  >
                    <List size={20} />
                  </button>
                </div>

                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="lg:hidden p-3 bg-primary text-white rounded-xl shadow-lg"
                >
                  <SlidersHorizontal size={20} />
                </button>
              </div>
            </div>

            {/* Mobile Filters Overlay */}
            <AnimatePresence>
               {isFilterOpen && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 10 }}
                   className="lg:hidden bg-white p-6 rounded-2xl shadow-xl border border-slate-100 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-8"
                 >
                    <div>
                      <h3 className="font-bold text-secondary mb-4">Collection</h3>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => handleCollectionChange('all')}
                          className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold border transition-all",
                            activeCollection === 'all' ? "bg-primary border-primary text-white" : "border-slate-200 text-slate-500"
                          )}
                        >
                          All Products
                        </button>
                        {collections.map(col => (
                          <button 
                            key={col.id}
                            onClick={() => handleCollectionChange(col.id)}
                            className={cn(
                              "px-4 py-2 rounded-full text-xs font-bold border transition-all",
                              activeCollection === col.id ? "bg-primary border-primary text-white" : "border-slate-200 text-slate-500"
                            )}
                          >
                            {col.title}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-secondary mb-4">Price Range</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="number" 
                          placeholder="Min Price"
                          value={minPrice}
                          onChange={e => setMinPrice(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-sm"
                        />
                        <input 
                          type="number" 
                          placeholder="Max Price"
                          value={maxPrice}
                          onChange={e => setMaxPrice(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-secondary mb-4">Actions</h3>
                      <button onClick={() => setIsFilterOpen(false)} className="btn-secondary w-full">Apply Filters</button>
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>

            {/* Product Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Search size={48} className="text-slate-200 mx-auto mb-4" />
                <h2 className="text-xl font-display font-bold text-secondary">No matching products found</h2>
                <p className="text-slate-500 mb-8">Try adjusting your filters or search terms.</p>
                <button onClick={() => {setSearchQuery(''); handleCollectionChange('all'); setMinPrice(''); setMaxPrice('');}} className="btn-primary">Clear all filters</button>
              </div>
            )}

            {/* Load More */}
            {filteredProducts.length > 0 && (
              <div className="mt-16 text-center">
                <button className="btn-secondary px-12 border-2 border-slate-100 hover:bg-slate-50 text-secondary">
                  Load More Products
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
