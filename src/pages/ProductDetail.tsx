import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useInventory } from '../context/InventoryContext';
import { ShoppingCart, ArrowLeft, ShieldCheck, Truck, RefreshCw, Star, Info, MessageSquare, ChevronRight, Heart, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import SEO from '../components/SEO';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { auditAndSanitizeReview } from '../lib/securityGateway';

function parseInlineMarkdown(text: string): string {
  let result = text;
  
  // Triple asterisks (bold + italic)
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Double asterisks (bold)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Single asterisks (italic)
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Underscores (italic)
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>');
  // Code backticks
  result = result.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs text-red-600">$1</code>');
  // Links: [text](href)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary-hover font-bold transition-all" target="_blank" rel="noopener noreferrer">$1</a>');

  return result;
}

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Split by double newlines or single entries to form blocks
  const blocks = html.split(/\n\s*\n/);
  const parsedBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    // If it already is structured in a HTML block tag, parse only inline contents
    if (/^<(h\d|p|div|ul|ol|li|section|blockquote|table)/i.test(trimmed)) {
      return parseInlineMarkdown(trimmed);
    }

    // Capture list formats
    const lines = trimmed.split('\n');
    if (lines.length > 0 && (
      lines[0].trim().startsWith('- ') || 
      lines[0].trim().startsWith('* ') || 
      lines[0].trim().startsWith('• ') || 
      /^\d+\.\s/.test(lines[0].trim())
    )) {
      const isNum = /^\d+\.\s/.test(lines[0].trim());
      const listItems = lines.map(line => {
        const lineTrimmed = line.trim();
        let content = lineTrimmed;
        if (lineTrimmed.startsWith('- ') || lineTrimmed.startsWith('* ') || lineTrimmed.startsWith('• ')) {
          content = lineTrimmed.substring(2).trim();
        } else {
          const match = lineTrimmed.match(/^\d+\.\s(.*)/);
          content = match ? match[1].trim() : lineTrimmed;
        }
        return `<li class="font-semibold text-slate-600 text-sm list-inside list-item py-0.5">${parseInlineMarkdown(content)}</li>`;
      }).join('\n');

      if (isNum) {
        return `<ol class="list-decimal pl-5 my-3 space-y-1 text-slate-600 font-semibold text-sm">${listItems}</ol>`;
      } else {
        return `<ul class="list-disc pl-5 my-3 space-y-1 text-slate-600 font-semibold text-sm">${listItems}</ul>`;
      }
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      return `<h1 class="text-2xl font-bold text-secondary mt-5 mb-2">${parseInlineMarkdown(trimmed.substring(2))}</h1>`;
    }
    if (trimmed.startsWith('## ')) {
      return `<h2 class="text-xl font-bold text-secondary mt-4 mb-2">${parseInlineMarkdown(trimmed.substring(3))}</h2>`;
    }
    if (trimmed.startsWith('### ')) {
      return `<h3 class="text-lg font-bold text-secondary mt-3 mb-2">${parseInlineMarkdown(trimmed.substring(4))}</h3>`;
    }
    if (trimmed.startsWith('#### ')) {
      return `<h4 class="text-base font-bold text-secondary mt-3 mb-2">${parseInlineMarkdown(trimmed.substring(5))}</h4>`;
    }

    // Default: paragraph blocks
    return `<p class="my-2.5 text-slate-600 text-sm font-semibold leading-relaxed">${parseInlineMarkdown(trimmed)}</p>`;
  });

  return parsedBlocks.filter(b => b !== '').join('\n');
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const { customerProfile, addWishlistItem, removeWishlistItem } = useCustomerAuth();
  const { inventoryLevels } = useInventory();
  
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'warranty' | 'reviews'>('desc');

  const product = useMemo(() => products.find(p => p.id === id), [products, id]);

  // Option selection tracking
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // When product or options change, set default selections
  useEffect(() => {
    if (product && product.options && product.options.length > 0) {
      const defaults: Record<string, string> = {};
      product.options.forEach(opt => {
        if (opt.values && opt.values.length > 0) {
          defaults[opt.name] = opt.values[0];
        }
      });
      setSelectedOptions(defaults);
    } else {
      setSelectedOptions({});
    }
  }, [product]);

  // Find the selected variant matching the selected options
  const selectedVariant = useMemo(() => {
    if (!product || !product.variants || product.variants.length === 0) return null;
    return product.variants.find(v => {
      return Object.entries(selectedOptions).every(([key, value]) => {
        return v.options[key] === value;
      });
    }) || product.variants[0] || null;
  }, [product, selectedOptions]);

  // Find active level for this product and selected variant
  const activeLevel = useMemo(() => {
    if (!product) return null;
    return inventoryLevels.find(lvl => {
      if (selectedVariant) {
        return lvl.productId === product.id && lvl.variantId === selectedVariant.id;
      }
      return lvl.productId === product.id && !lvl.variantId;
    });
  }, [inventoryLevels, product, selectedVariant]);

  // Determine if the product/variant is out of stock using a bulletproof fallback structure
  const isOutOfStock = useMemo(() => {
    if (!product) return true;
    
    // 1. If we have active level, respect activeLevel's quantities if tracked
    if (activeLevel) {
      if (activeLevel.isTracked === false) return false;
      return (activeLevel.quantityAvailable ?? 0) <= 0;
    }
    
    // 2. Fallback: If product has variants, check variant inventory
    if (product.productType === 'variable' && product.variants && product.variants.length > 0) {
      if (selectedVariant) {
        return (selectedVariant.inventory !== undefined && selectedVariant.inventory <= 0);
      }
      return !product.variants.some((v: any) => (v.inventory || 0) > 0);
    }
    
    // 3. Fallback: Simple product with positive inventory
    if (product.inventory !== undefined && product.inventory > 0) {
      return false;
    }
    
    // 4. Ultimate fallback to raw document-level boolean
    return !product.inStock;
  }, [product, activeLevel, selectedVariant]);

  // Handle price display
  const priceToDisplay = useMemo(() => {
    if (selectedVariant) return selectedVariant.price;
    return product?.price || 0;
  }, [product, selectedVariant]);

  // Ensure selected quantity range is valid for the current available stock
  useEffect(() => {
    if (activeLevel) {
      const maxQty = activeLevel.quantityAvailable ?? 50;
      if (maxQty === 0) {
        setQuantity(0);
      } else if (quantity > maxQty) {
        setQuantity(maxQty);
      } else if (quantity < 1) {
        setQuantity(1);
      }
    }
  }, [activeLevel, quantity]);

  const isWishlisted = useMemo(() => {
    return customerProfile?.wishlist?.includes(id || '') || false;
  }, [customerProfile?.wishlist, id]);

  // Active selected image URL state
  const [activeImgUrl, setActiveImgUrl] = useState(product?.imageUrl || '');

  useEffect(() => {
    if (product) {
       setActiveImgUrl(product.imageUrl);
    }
  }, [product]);

  // Gallery images list to display
  const galleryImagesToDisplay = useMemo(() => {
    if (product?.images && product.images.length > 0) {
      return product.images;
    }
    // Deeply coherent fallbacks to make a functional detail gallery page
    return [
      { id: '1', url: product?.imageUrl || '', isPrimary: true },
      { id: '2', url: `https://picsum.photos/seed/view2-${product?.id || 'id'}/800/805` },
      { id: '3', url: `https://picsum.photos/seed/view3-${product?.id || 'id'}/800/805` },
      { id: '4', url: `https://picsum.photos/seed/view4-${product?.id || 'id'}/800/805` }
    ];
  }, [product]);

  // Live reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  // New review state
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Fetch reviews from Firestore in real-time
  useEffect(() => {
    if (!product) return;
    setLoadingReviews(true);
    const q = query(
      collection(db, 'product_reviews'),
      where('productId', '==', product.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort reviews newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(list);
      setLoadingReviews(false);
    }, (error) => {
      console.error("Error loading product reviews:", error);
      setLoadingReviews(false);
    });

    return () => unsubscribe();
  }, [product]);

  // Calculate dynamic average and total reviews
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return parseFloat((sum / reviews.length).toFixed(1));
  }, [reviews]);

  const totalReviewsCount = useMemo(() => {
    return reviews.length;
  }, [reviews]);

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const rating = Math.round(r.rating) as 5|4|3|2|1;
      if (counts[rating] !== undefined) {
        counts[rating]++;
      }
    });
    return counts;
  }, [reviews]);

  const reviewsToDisplay = useMemo(() => {
    return reviews;
  }, [reviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!reviewComment.trim()) {
      setReviewError("Please include some product feedback comments.");
      return;
    }
    
    setIsSubmittingReview(true);
    setReviewError('');
    try {
      const reviewer = reviewName.trim() || (customerProfile ? `${customerProfile.firstName} ${customerProfile.lastName}` : 'Guest User');
      
      // Perform security audit and sanitization
      const auditResult = auditAndSanitizeReview(reviewComment.trim());
      if (auditResult.sanitization_action === 'Reject_Entirely') {
        setReviewError("Review block flagged: Content contains prohibited code or potential injection commands.");
        setIsSubmittingReview(false);
        return;
      }

      await addDoc(collection(db, 'product_reviews'), {
        productId: product.id,
        productName: product.name,
        rating: Number(reviewRating),
        comment: auditResult.clean_text,
        reviewerName: reviewer,
        createdAt: new Date().toISOString(),
        verifiedPurchase: !!customerProfile
      });

      setReviewSuccess(true);
      setReviewComment('');
      setReviewName('');
      setReviewRating(5);
      
      // Auto disappear success message
      setTimeout(() => setReviewSuccess(false), 5000);
    } catch (err: any) {
      console.error("Failed to post customer review:", err);
      setReviewError("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleWishlistClick = async () => {
    if (!product) return;
    if (!customerProfile) {
      navigate(`/account?wishlist_add_redirect=${product.id}`);
      return;
    }
    try {
      if (isWishlisted) {
        await removeWishlistItem(product.id);
      } else {
        await addWishlistItem(product.id);
      }
    } catch {
      alert("Unable to modify wishlist.");
    }
  };

  useEffect(() => {
    if (product) {
      if (typeof (window as any).logCustomTelemetry === 'function') {
        (window as any).logCustomTelemetry('view_item', {
          item_id: product.id,
          item_name: product.name,
          price: priceToDisplay,
          category: product.tags?.[0] || 'General'
        });
      }
    }
  }, [product, priceToDisplay]);

  const handleAddToCart = () => {
    if (!product) return;
    
    let productToCart = { ...product };
    if (selectedVariant) {
      productToCart = {
        ...product,
        id: `${product.id}_${selectedVariant.id}`,
        name: `${product.name} - ${selectedVariant.title}`,
        price: selectedVariant.price,
        imageUrl: product.imageUrl,
        inventory: selectedVariant.inventory,
        inStock: selectedVariant.inventory > 0,
        originalProductId: product.id,
        variantId: selectedVariant.id
      } as any;
    }
    
    addToCart(productToCart, quantity || 1);
    
    if (typeof (window as any).logCustomTelemetry === 'function') {
      (window as any).logCustomTelemetry('add_to_cart', {
        item_id: productToCart.id,
        item_name: productToCart.name,
        price: productToCart.price,
        category: productToCart.tags?.[0] || 'General',
        quantity: quantity || 1
      });
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    let productToCart = { ...product };
    if (selectedVariant) {
      productToCart = {
        ...product,
        id: `${product.id}_${selectedVariant.id}`,
        name: `${product.name} - ${selectedVariant.title}`,
        price: selectedVariant.price,
        imageUrl: product.imageUrl,
        inventory: selectedVariant.inventory,
        inStock: selectedVariant.inventory > 0,
        originalProductId: product.id,
        variantId: selectedVariant.id
      } as any;
    }
    
    addToCart(productToCart, quantity || 1);
    
    if (typeof (window as any).logCustomTelemetry === 'function') {
      (window as any).logCustomTelemetry('add_to_cart', {
        item_id: productToCart.id,
        item_name: productToCart.name,
        price: productToCart.price,
        category: productToCart.tags?.[0] || 'General',
        quantity: quantity || 1
      });
    }
    
    navigate('/checkout');
  };

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-display font-bold mb-4">Product Not Found</h2>
        <Link to="/shop" className="btn-primary">Return to Shop</Link>
      </div>
    );
  }

  const relatedProducts = products.filter(p => p.id !== product.id && (p.tags?.some(t => product.tags?.includes(t)) || p.brand === product.brand)).slice(0, 4);

  const productSchema = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "image": product.imageUrl,
      "description": product.description,
      "sku": product.id,
      "brand": {
        "@type": "Brand",
        "name": product.brand || "Samkhi"
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "JMD",
        "price": product.price,
        "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition"
      }
    };
  }, [product]);

  return (
    <div className="bg-surface min-h-screen pb-24">
      <SEO 
        title={product.name} 
        description={product.description} 
        ogType="product"
        ogImage={product.imageUrl}
        schema={productSchema}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight size={14} />
          <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
          <ChevronRight size={14} />
          {product.tags && product.tags.length > 0 ? (
            <Link to={`/shop?collection=${product.tags[0].toLowerCase()}`} className="hover:text-primary transition-colors uppercase tracking-widest">{product.tags[0]}</Link>
          ) : (
            <span className="uppercase tracking-widest">General</span>
          )}
          <ChevronRight size={14} />
          <span className="text-secondary truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Gallery */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-square bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl flex items-center justify-center p-4"
            >
              <img 
                src={activeImgUrl || product.imageUrl} 
                alt={product.name} 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <div className="grid grid-cols-4 gap-4">
              {galleryImagesToDisplay.map((img: any, idx: number) => {
                const isSelected = (activeImgUrl || product.imageUrl) === img.url;
                return (
                  <div 
                    key={img.id || idx} 
                    onClick={() => setActiveImgUrl(img.url)}
                    className={cn(
                      "aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-white p-1 flex items-center justify-center",
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-slate-100 hover:border-slate-300"
                    )}
                  >
                     <img 
                       src={img.thumbnailUrl || img.url} 
                       alt={`View ${idx + 1}`} 
                       className="w-full h-full object-contain" 
                     />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="mb-6">
              <h1 className="text-4xl md:text-5xl font-display font-black text-secondary mb-4 leading-tight">{product.name}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags && product.tags.map(t => (
                  <span key={t} className="text-primary font-black uppercase text-xs tracking-[0.3em] inline-block mr-4 py-1 px-2.5 bg-primary/5 rounded">{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-4">
                 <div className="flex text-cta">
                   {[...Array(5)].map((_, i) => (
                     <Star 
                       key={i} 
                       size={18} 
                       className={cn(
                         "fill-current",
                         i < Math.round(averageRating) ? "text-cta" : "text-slate-200"
                       )} 
                     />
                   ))}
                 </div>
                 <span className="text-secondary font-bold text-sm ml-1">{averageRating} out of 5</span>
                 <span className="text-slate-400 font-bold ml-2">
                   ({totalReviewsCount} {totalReviewsCount === 1 ? 'Customer Review' : 'Customer Reviews'})
                 </span>
              </div>
              <p className="text-3xl font-display font-black text-secondary">
                J${priceToDisplay.toLocaleString()}
              </p>
            </div>

            {/* Live Options & Variants Selection */}
            {product.options && product.options.length > 0 && (
              <div className="mb-6 space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Package size={14} className="text-primary" /> Select Options
                </h3>
                {product.options.map(opt => (
                  <div key={opt.name} className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 block">{opt.name}:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {opt.values.map(val => {
                        const isSelected = selectedOptions[opt.name] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.name]: val }))}
                            className={cn(
                              "px-3 py-1.5 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer",
                              isSelected 
                                ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-55"
                            )}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Config & Add to Cart */}
            <div className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8`}>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex items-center bg-slate-100 rounded-xl overflow-hidden self-stretch sm:self-auto">
                   <button 
                    type="button"
                    disabled={activeLevel && activeLevel.quantityAvailable <= 0}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-6 py-4 hover:bg-slate-200 transition-colors text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                     -
                   </button>
                   <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                   <button 
                    type="button"
                    disabled={activeLevel && quantity >= activeLevel.quantityAvailable}
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-6 py-4 hover:bg-slate-200 transition-colors text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                     +
                   </button>
                </div>
                <button 
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={cn(
                    "flex-1 py-4 text-lg self-stretch sm:self-auto whitespace-nowrap btn-primary transition-all flex items-center justify-center gap-2 pointer-events-auto cursor-pointer",
                    isOutOfStock ? "opacity-60 bg-red-650 border-red-650 hover:bg-red-650 cursor-not-allowed shadow-none" : ""
                  )}
                >
                  <ShoppingCart size={24} />
                  {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button
                  type="button"
                  onClick={handleWishlistClick}
                  className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer ${
                    isWishlisted 
                      ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 scale-105 shadow-sm' 
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-red-500 hover:bg-red-50 hover:border-red-100'
                  }`}
                  title={isWishlisted ? "Remove from bookmarked items" : "Add to Saved list"}
                >
                  <Heart size={24} className={isWishlisted ? 'fill-red-500 text-red-500 transition-colors' : 'text-slate-400 transition-colors'} />
                </button>
              </div>

              {/* Quick Checkout / Buy Now Button */}
              <button
                type="button"
                id="btn-quick-checkout"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className={cn(
                  "w-full mt-4 py-4 text-base font-bold bg-[#10B571] hover:bg-[#0E9D61] text-white rounded-xl transition-all flex items-center justify-center gap-2 pointer-events-auto cursor-pointer shadow-enterprise uppercase tracking-wider",
                  isOutOfStock ? "hidden" : ""
                )}
              >
                <CheckCircle size={20} />
                Buy It Now (Express Checkout)
              </button>
              
              <button 
                onClick={() => window.open(`https://wa.me/18766303350?text=Interested in ${product.name}`, '_blank')}
                className="w-full mt-4 flex items-center justify-center gap-2 text-green-600 font-bold py-3 rounded-xl border-2 border-green-50 hover:bg-green-50 transition-all font-display uppercase tracking-widest text-xs"
              >
                <MessageSquare size={18} />
                WhatsApp Inquiry
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
               <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-50">
                  <ShieldCheck className="text-primary" size={24} />
                  <span className="text-sm font-bold text-secondary">2-Year Warranty</span>
               </div>
               <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-50">
                  <Truck className="text-primary" size={24} />
                  <span className="text-sm font-bold text-secondary">Islandwide Delivery</span>
               </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-6 flex gap-6 overflow-x-auto whitespace-nowrap pb-1">
              {(['desc', 'warranty', 'reviews'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                    activeTab === tab ? "text-primary" : "text-slate-400 hover:text-secondary"
                  )}
                >
                  {tab === 'desc' ? 'Description' : tab === 'warranty' ? 'Warranty' : `Reviews (${totalReviewsCount})`}
                  {activeTab === tab && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-[150px]">
              {activeTab === 'desc' && (
                <div className="space-y-6">
                  {product.description ? (
                    <div 
                      className="text-slate-600 text-sm font-semibold leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: parseMarkdownToHtml(product.description) 
                      }} 
                    />
                  ) : (
                    <p className="text-slate-500 italic text-sm font-semibold">No description available for this product.</p>
                  )}


                </div>
              )}
              {activeTab === 'warranty' && (
                <p className="text-slate-500 text-sm leading-relaxed font-semibold">
                  Samkhi Limited provides a standard 2-year manufacturer warranty on all electrical components. Solar panels carry a 25-year performance warranty. Our local support team is available for any technical troubleshooting needs.
                </p>
              )}
              {activeTab === 'reviews' && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Reviews Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div>
                      <h4 className="text-secondary font-black text-lg mb-2">Customer Feedback</h4>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-4xl font-display font-black text-secondary">{averageRating}</span>
                        <span className="text-sm font-bold text-slate-400">out of 5</span>
                      </div>
                      <div className="flex text-cta mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={18} 
                            className={cn(
                              "fill-current",
                              i < Math.round(averageRating) ? "text-cta" : "text-slate-200"
                            )} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">
                        Based on {totalReviewsCount} detailed customer evaluations.
                      </p>
                    </div>

                    {/* Breakdown bars */}
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = ratingCounts[stars as 5|4|3|2|1] || 0;
                        const percentage = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <span className="w-12 text-slate-400 whitespace-nowrap">{stars} Stars</span>
                            <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-cta rounded-full" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-slate-400">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submission success/error messages */}
                  {reviewSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-xl flex items-center gap-2">
                      <CheckCircle size={16} /> Thank you! Your product review has been published successfully.
                    </div>
                  )}
                  {reviewError && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2">
                      <AlertTriangle size={16} /> {reviewError}
                    </div>
                  )}

                  {/* Write a product review form */}
                  <form onSubmit={handleSubmitReview} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="text-secondary font-black text-sm uppercase tracking-wider">Share Your Experience</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] uppercase tracking-wide text-slate-400 font-black block">Your Name (Optional)</label>
                        <input 
                          type="text" 
                          value={reviewName}
                          onChange={(e) => setReviewName(e.target.value)}
                          placeholder={customerProfile ? `${customerProfile.firstName} ${customerProfile.lastName}` : "Enter your nickname"}
                          className="w-full bg-slate-50 border border-slate-200 focus:focus-within:border-primary text-slate-800 text-sm py-2.5 px-3.5 rounded-xl transition-all font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] uppercase tracking-wide text-slate-400 font-black block font-sans">Product Rating</label>
                        <select 
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 focus:focus-within:border-primary text-slate-800 text-sm py-2.5 px-3.5 rounded-xl transition-all font-semibold font-sans focus:outline-none"
                        >
                          <option value="5">⭐⭐⭐⭐⭐ Excellent (5 Stars)</option>
                          <option value="4">⭐⭐⭐⭐ Great (4 Stars)</option>
                          <option value="3">⭐⭐⭐ Good (3 Stars)</option>
                          <option value="2">⭐⭐ Fair (2 Stars)</option>
                          <option value="1">⭐ Poor (1 Star)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-slate-400 font-black block select-none">Review Comments</label>
                      <textarea 
                        rows={3}
                        required
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="What did you like or dislike? Does it save energy effectively?"
                        className="w-full bg-slate-50 border border-slate-200 focus:focus-within:border-primary text-slate-800 text-sm py-2.5 px-3.5 rounded-xl transition-all font-semibold focus:outline-none"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmittingReview}
                      className="btn-primary text-xs tracking-widest py-3 px-6 uppercase font-black cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit My Review"}
                    </button>
                  </form>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    <h4 className="text-secondary font-black text-sm uppercase tracking-wider">{totalReviewsCount} Customer Appraisals</h4>
                    <div className="divide-y divide-slate-100">
                      {reviewsToDisplay.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-xs font-semibold">
                          No reviews yet. Be the first to share your feedback for this product!
                        </div>
                      ) : reviewsToDisplay.map((r: any) => (
                        <div key={r.id} className="py-6 space-y-2 first:pt-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-extrabold text-secondary text-sm">{r.reviewerName || 'Customer'}</span>
                            <span className="text-xs font-bold text-slate-400 font-mono">
                              {new Date(r.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex text-cta">
                              {[...Array(5)].map((_, idx) => (
                                <Star 
                                  key={idx} 
                                  size={14} 
                                  className={cn(
                                    "fill-current",
                                    idx < r.rating ? "text-cta" : "text-slate-200"
                                  )} 
                                />
                              ))}
                            </div>
                            {r.verifiedPurchase && (
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 font-sans text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-green-100">
                                <CheckCircle size={8} /> Verified Purchase
                              </span>
                            )}
                          </div>
                          
                          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-semibold">
                            {r.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <section className="mt-24">
           <h2 className="text-3xl font-display font-black text-secondary mb-10">Frequently Bought Together</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
             {relatedProducts.map(p => (
               <RelatedProductCard key={p.id} product={p} />
             ))}
           </div>
        </section>
      </div>
    </div>
  );
}

const RelatedProductCard: React.FC<{ product: any }> = ({ product }) => {
  return (
    <Link to={`/product/${product.id}`} className="group block bg-white p-4 rounded-2xl border border-slate-100 hover:shadow-xl transition-all">
       <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-slate-50">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
       </div>
       <h3 className="font-bold text-secondary group-hover:text-primary transition-colors truncate">{product.name}</h3>
       <p className="text-primary font-black text-sm mt-1">J${product.price.toLocaleString()}</p>
    </Link>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
