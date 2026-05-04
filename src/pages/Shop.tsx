import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PRODUCTS, CATEGORIES } from '../data';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeCategory = searchParams.get('category') || 'all';

  const filteredProducts = useMemo(() => {
    let result = PRODUCTS;

    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-low') result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') result = [...result].sort((a, b) => b.price - a.price);

    return result;
  }, [activeCategory, searchQuery, sortBy]);

  const handleCategoryChange = (catId: string) => {
    if (catId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
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
              <h3 className="text-sm font-black text-secondary uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Categories</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => handleCategoryChange('all')}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                    activeCategory === 'all' ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  All Products
                </button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all",
                      activeCategory === cat.id ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
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
                  onChange={e => setSearchQuery(e.target.value)}
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
                      <h3 className="font-bold text-secondary mb-4">Category</h3>
                      <div className="flex flex-wrap gap-2">
                        {['all', ...CATEGORIES.map(c => c.id)].map(id => (
                          <button 
                            key={id}
                            onClick={() => handleCategoryChange(id)}
                            className={cn(
                              "px-4 py-2 rounded-full text-xs font-bold border transition-all",
                              activeCategory === id ? "bg-primary border-primary text-white" : "border-slate-200 text-slate-500"
                            )}
                          >
                            {id.replace('-', ' ')}
                          </button>
                        ))}
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
                <button onClick={() => {setSearchQuery(''); handleCategoryChange('all');}} className="btn-primary">Clear all filters</button>
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
