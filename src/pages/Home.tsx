import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Zap, Lightbulb, Sun, ShieldCheck, ChevronRight, PlayCircle, Star, Quote, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { COLLECTIONS } from '../data';
import ProductCard from '../components/ProductCard';
import CollectionCard from '../components/CollectionCard';
import SolarQuoteForm from '../components/SolarQuoteForm';
import SEO from '../components/SEO';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function Home() {
  const { products } = useProducts();
  const [activeCollections, setActiveCollections] = useState<any[]>([]);
  const [collectionProducts, setCollectionProducts] = useState<any[]>([]);

  useEffect(() => {
    // Dynamic Collections Sync from Firestore with Fallback & Order preservation
    const unsubColl = onSnapshot(collection(db, 'collections'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({ id: d.id, ...data });
      });
      
      const filtered = list.filter(c => c.status === 'active' || !c.status);
      // Merge Firestore dynamic properties into our ordered categories template
      const ordered = COLLECTIONS.map(staticCol => {
        const found = filtered.find(fc => 
          fc.title?.toLowerCase() === staticCol.title?.toLowerCase() || 
          fc.id === staticCol.id ||
          fc.handle === staticCol.id
        );
        if (found) {
          const portalImage = found.image_url || found.imageUrl;
          return {
            ...staticCol,
            ...found,
            image_url: portalImage || staticCol.imageUrl,
            imageUrl: portalImage || staticCol.imageUrl,
          };
        }
        return staticCol;
      });

      // Include active collections created in portal not matching standard seed categories
      const matchedIds = new Set(ordered.map(o => o.id));
      const extraCollections = filtered
        .filter(fc => !matchedIds.has(fc.id))
        .map(fc => ({
          ...fc,
          imageUrl: fc.image_url || fc.imageUrl,
          image_url: fc.image_url || fc.imageUrl,
        }));

      setActiveCollections([...ordered, ...extraCollections]);
    }, (error) => {
      console.warn("Unable to fetch collections on home, falling back to seed data", error);
      setActiveCollections(COLLECTIONS.filter(c => c.status === 'active' || !c.status));
    });

    const unsubLinks = onSnapshot(collection(db, 'collection_products'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setCollectionProducts(list);
    }, (error) => {
      console.warn("Unable to fetch collection products mapping on home:", error);
    });

    return () => {
      unsubColl();
      unsubLinks();
    };
  }, []);

  const featuredProducts = useMemo(() => {
    // Try to find the "Solar Lighting & Security" collection or similar
    const targetCol = activeCollections.find(c => 
      c.title?.toLowerCase() === 'solar lighting & security' || 
      c.title?.toLowerCase() === 'solar lighting' ||
      c.title?.toLowerCase() === 'led lighting' ||
      c.id === 'solar-lighting-security'
    );

    if (targetCol) {
      const type = targetCol.collection_type || targetCol.type;
      if (type === 'automated') {
        const ruleSet = targetCol.rule_set || { conditions: targetCol.conditions || [], match: targetCol.conditionOperator || 'all' };
        
        const matchProduct = (product: any, rules: any) => {
          if (!rules || !rules.conditions || rules.conditions.length === 0) return false;
          const results = rules.conditions.map((cond: any) => {
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
          return rules.match === 'any' ? results.some(r => r === true) : results.every(r => r === true);
        };
        const matched = products.filter(p => matchProduct(p, ruleSet));
        if (matched.length > 0) return matched.slice(0, 4);
      } else {
        const mappedProductIds = collectionProducts
          .filter((link: any) => link.collection_id === targetCol.id)
          .map((link: any) => link.product_id);
        const matched = products.filter(p => mappedProductIds.includes(p.id));
        if (matched.length > 0) return matched.slice(0, 4);
      }
    }

    // Fallback search tags
    const lightingProducts = products.filter(p => 
      p.tags?.some(t => 
        ['led lighting', 'solar lighting & security', 'solar flood', 'solar lighting', 'lighting', 'security', 'flood'].includes(t.toLowerCase())
      ) || 
      p.name.toLowerCase().includes('solar flood') || 
      p.name.toLowerCase().includes('led panel') ||
      p.name.toLowerCase().includes('chandelier')
    );

    if (lightingProducts.length > 0) {
      return lightingProducts.slice(0, 4);
    }

    return products.filter(p => p.isFeatured).slice(0, 4);
  }, [products, activeCollections, collectionProducts]);

  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Samkhi Limited JMD",
    "image": "https://picsum.photos/seed/store/1200/630",
    "description": "Samkhi Limited JMD. Professional clean energy systems and solar equipment suppliers in Jamaica.",
    "telephone": "+1 (876) 630-3350",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "JMD Complex, Mandeville",
      "addressLocality": "Mandeville",
      "addressCountry": "JM"
    }
  };

  return (
    <div className="flex flex-col">
      <SEO 
        title="Premium Solar Energy Systems & Supplies Jamaica" 
        description="Experience ultimate cost savings with Samkhi Limited. Professional clean energy systems, premium solar panels, hybrid invertors, and lithium-ion batteries across Jamaica."
        schema={homeSchema}
      />
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center bg-gradient-to-br from-[#060a17] via-[#0b1328] to-[#050813] overflow-hidden grid-bg">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-2/3 h-full bg-primary/5 -skew-x-12 translate-x-32" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#060a17]/80 via-[#0b1328] to-emerald-950/10" />
        <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
        
        {/* Subtle professional installation outcome background photo */}
        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06] select-none mix-blend-overlay z-0">
          <img 
            src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1920&q=80" 
            alt="Professional solar installation outcome" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060a17]/30 via-transparent to-[#050813]/60" />
        </div>
        
        {/* Slight teal glow behind the video */}
        <div className="absolute right-[-10%] top-[15%] w-[600px] h-[600px] bg-teal-500/8 rounded-full blur-[140px] pointer-events-none mix-blend-screen z-0" />
        
        {/* Soft green accent behind the CTA */}
        <div className="absolute left-[15%] bottom-[20%] w-[500px] h-[500px] bg-emerald-500/6 rounded-full blur-[140px] pointer-events-none mix-blend-screen z-0" />
        
        {/* Abstract Solar Grid Background Pattern */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-[0.06] select-none z-0">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-emerald-400 stroke-current"
          >
            <defs>
              <pattern id="solar-cell-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
                <rect width="11" height="11" fill="none" strokeWidth="0.5" stroke="currentColor" rx="1" />
                <line x1="5.5" y1="0" x2="5.5" y2="11" strokeWidth="0.25" stroke="currentColor" strokeDasharray="1,1" />
                <line x1="0" y1="5.5" x2="11" y2="5.5" strokeWidth="0.25" stroke="currentColor" strokeDasharray="1,1" />
              </pattern>
            </defs>
            <g transform="rotate(12) skewX(-12) scale(0.9) translate(-10, -10)">
              {/* Main Solar panel array blocks */}
              <rect width="84" height="84" x="10" y="10" fill="url(#solar-cell-pattern)" stroke="currentColor" strokeWidth="1" rx="2" />
              {/* Technical/abstract grid alignment accents */}
              <circle cx="10" cy="10" r="1.5" fill="currentColor" />
              <circle cx="94" cy="10" r="1.5" fill="currentColor" />
              <circle cx="10" cy="94" r="1.5" fill="currentColor" />
              <circle cx="94" cy="94" r="1.5" fill="currentColor" />
              {/* Radial power surge indicator circles */}
              <circle cx="52" cy="52" r="28" strokeWidth="0.5" stroke="currentColor" strokeDasharray="2,4" />
              <circle cx="52" cy="52" r="42" strokeWidth="0.5" stroke="currentColor" strokeDasharray="3,6" />
              <line x1="52" y1="0" x2="52" y2="100" strokeWidth="0.5" stroke="currentColor" strokeDasharray="4,4" />
              <line x1="0" y1="52" x2="100" y2="52" strokeWidth="0.5" stroke="currentColor" strokeDasharray="4,4" />
            </g>
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:items-start items-center relative z-10 py-14 md:py-18 lg:py-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Jamaica's Sustainable Energy Leader
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-[0.95] mb-8 tracking-tight">
              Switch to Solar <br />
              <span className="text-cta italic">Save Today.</span>
            </h1>
            <p className="text-xl text-slate-400 mb-12 max-w-lg leading-relaxed font-medium">
              Enterprise-grade LED lighting and solar energy systems for Jamaica's leading homes and businesses. 
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <Link to="/shop" className="btn-cta text-lg group">
                Shop Products
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/solar" className="btn-secondary text-lg border border-white/20">
                Request Solar Quote
                <Sun className="text-cta" size={20} />
              </Link>
            </div>

            <div className="mb-12 border-t border-white/5 pt-8 w-full max-w-xl lg:max-w-none">
              <p className="text-[10px] uppercase tracking-[0.25em] font-black text-slate-500 mb-4 font-mono">
                Authorized Distributor
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-black text-slate-400 font-display">
                <span className="hover:text-white transition-colors cursor-default tracking-wider">SUNTEC</span>
                <span className="text-white/10 select-none">•</span>
                <span className="hover:text-white transition-colors cursor-default tracking-wider">SRNE</span>
                <span className="text-white/10 select-none">•</span>
                <span className="hover:text-white transition-colors cursor-default tracking-wider">DEYE</span>
                <span className="text-white/10 select-none">•</span>
                <span className="hover:text-white transition-colors cursor-default tracking-wider">JA SOLAR</span>
                <span className="text-white/10 select-none">•</span>
                <span className="hover:text-white transition-colors cursor-default tracking-wider">TCL</span>
                <span className="text-white/10 select-none">•</span>
                <span className="hover:text-white transition-colors cursor-default tracking-wider">ECOLITE LED LIGHTING</span>
              </div>
            </div>

            <div className="mb-12 flex items-center gap-6">
              <div className="flex items-center gap-4 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-secondary relative z-10 shadow-lg -rotate-3 group-hover:rotate-0 transition-transform">
                    <Zap size={28} className="fill-secondary" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Monthly Savings</p>
                  <p className="text-3xl font-black text-white leading-none">Up to 90%</p>
                </div>
              </div>
              <div className="h-12 w-px bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-secondary bg-slate-800 flex items-center justify-center overflow-hidden">
                      <img src={`https://i.pravatar.cc/150?u=${i}`} alt="User" />
                    </div>
                  ))}
                </div>
                <div className="text-slate-400 text-sm hidden sm:block">
                  <span className="text-white font-bold">500+</span> Customers Trusted
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full lg:scale-105 xl:scale-110 origin-center lg:origin-right lg:mt-14 transition-all duration-500"
          >
            {/* Subtle premium glow behind the video */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 rounded-3xl blur-2xl opacity-75 -z-10" />
            
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(16,181,113,0.15)] border-4 border-white/10 bg-slate-950">
              <iframe 
                src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D900836707811508&show_text=0&width=560" 
                className="w-full h-full"
                style={{ border: 'none', overflow: 'hidden' }} 
                scrolling="no" 
                frameBorder="0" 
                allowFullScreen={true} 
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-white py-16 border-y border-slate-100 grid-bg">
        <div className="max-w-7xl mx-auto px-4 pt-6 md:pt-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.1 }}
               className="flex items-center gap-5 group"
            >
              <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-primary shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="font-bold text-secondary text-base">100% Trusted</p>
                <p className="text-xs text-slate-500 font-medium tracking-wide">Government Registered</p>
              </div>
            </motion.div>
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.2 }}
               className="flex items-center gap-5 group"
            >
              <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-primary shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <div>
                <p className="font-bold text-secondary text-base">Expert Support</p>
                <p className="text-xs text-slate-500 font-medium tracking-wide">24/7 Technical Response</p>
              </div>
            </motion.div>
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.3 }}
               className="flex items-center gap-5 group"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform">
                <Sun size={28} />
              </div>
              <div>
                <p className="font-bold text-secondary text-base">Sustainable</p>
                <p className="text-xs text-slate-500 font-medium tracking-wide">Eco-Certified Products</p>
              </div>
            </motion.div>
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.4 }}
               className="flex items-center gap-5 group"
            >
              <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-primary shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                <Lightbulb size={28} />
              </div>
              <div>
                <p className="font-bold text-secondary text-base">Massive Savings</p>
                <p className="text-xs text-slate-500 font-medium tracking-wide">ROI Focused Design</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-xl">
              <h2 className="text-4xl font-display font-black text-secondary mb-4">Shop by Category</h2>
              <p className="text-slate-500 text-lg">Browse Jamaica's widest selection of solar equipment, LED lighting, backup power systems, and energy solutions for residential and commercial projects.</p>
            </div>
            <Link to="/shop" className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all">
              View All Products <ChevronRight size={20} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeCollections.slice(0, 7).map(col => (
              <CollectionCard key={col.id} collection={col} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-black uppercase tracking-[0.3em] text-xs">Our Most Popular Products</span>
            <h2 className="text-4xl md:text-5xl font-display font-black text-secondary mt-4 mb-6">Popular Solar Lighting & Security</h2>
            <div className="w-24 h-1.5 bg-cta mx-auto rounded-full" />
          </div>

          <div className="flex md:grid md:grid-cols-4 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0 gap-6 md:gap-8 scrollbar-none pb-8 md:pb-0">
            {featuredProducts.map(prod => (
              <div key={prod.id} className="min-w-[46vw] sm:min-w-[28vw] md:min-w-0 snap-start flex-shrink-0 md:flex-shrink">
                <ProductCard product={prod} />
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <Link to="/shop" className="btn-secondary px-10">
              Catalog
            </Link>
          </div>
        </div>
      </section>


      {/* Google Reviews Section */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black text-secondary mb-4 tracking-tight">The Best Rated in Jamaica</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
              Join hundreds of happy families and businesses who have switched to sustainable energy with Samkhi Limited.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                text: "Best solar provider in St. Ann! Samkhi helped us reduce our JPS bill by over 85% within the first month. Incredible service.",
                author: "Robert Thompson",
                role: "Homeowner",
                date: "2 months ago"
              },
              {
                text: "The technical knowledge of the engineers at the Drax Hall branch is unmatched. They designed a custom backup system for our hotel perfectly.",
                author: "Sarah Brown",
                role: "Commercial Client",
                date: "3 weeks ago"
              },
              {
                text: "Excellent selection of LED lighting for our office renovation. The quality is much higher than other retail stores. Professional staff!",
                author: "Michael Chang",
                role: "Business Owner",
                date: "1 month ago"
              }
            ].map((review, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative group flex flex-col h-full"
              >
                <div className="text-emerald-500/10 mb-6 absolute top-6 right-8">
                  <Quote size={40} className="fill-emerald-500/5" />
                </div>
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 font-medium leading-relaxed mb-8 flex-grow">"{review.text}"</p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black">
                    {review.author.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-secondary text-sm">{review.author}</h4>
                    <p className="text-xs text-slate-400 font-medium">{review.role} • {review.date}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-6">
            <a 
              href="https://share.google/DeoEkyK1OMEu3qhL3" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-10 py-5 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 hover:bg-slate-50 hover:border-slate-300 transition-all group shadow-sm active:scale-95"
            >
              <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="h-6" referrerPolicy="no-referrer" />
              <div className="h-6 w-px bg-slate-200" />
              <span className="font-black text-secondary uppercase tracking-widest text-xs">View All Reviews</span>
              <ArrowRight size={18} className="text-primary group-hover:translate-x-1 transition-transform" />
            </a>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4.9 / 5.0 Average Google Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solar Assessment / Quote Form */}
      <section className="py-24 bg-secondary text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 lg:p-16 border border-white/10 shadow-2xl flex flex-col justify-between min-h-[500px] group">
            {/* Background Photo of Solar Professional with Custom Gradient Overlays */}
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80" 
                alt="Professional solar engineer and consultant reviewing layouts and plans" 
                className="w-full h-full object-cover opacity-25 filter brightness-75 contrast-125 group-hover:scale-105 transition-transform duration-1000" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/95 to-secondary/50 lg:bg-gradient-to-r lg:from-secondary/95 lg:via-secondary/90 lg:to-secondary/60" />
            </div>

            <div className="relative z-10">
              <div className="p-3 bg-white/10 rounded-2xl w-fit mb-8 backdrop-blur-sm border border-white/5">
                <Sun className="text-cta" size={40} />
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-black mb-6 tracking-tight">See How Much You Could Save</h2>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                Not sure what system you need? Our experts analyze your energy consumption to design a custom solution that maximizes your ROI and minimizes waste.
              </p>
              <div className="space-y-6">
                {[
                  "Free Site Assessment",
                  "Custom System Design",
                  "Flexible Financing Available",
                  "Certified Installation Team"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 bg-cta rounded-full flex items-center justify-center text-secondary shadow-lg shadow-cta/20">
                      <Check size={14} className="stroke-[3]" />
                    </div>
                    <span className="font-bold tracking-wide text-slate-100">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <SolarQuoteForm />
          </motion.div>
        </div>
      </section>

      {/* Commercial Banner */}
      <section className="py-32 bg-white flex flex-col items-center">
        <div className="max-w-7xl mx-auto px-4 w-full">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-secondary rounded-[3rem] p-10 md:p-24 text-white relative overflow-hidden group shadow-enterprise border-l-8 border-emerald-500"
          >
             <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-500/5 -skew-x-12 translate-x-24 transition-transform group-hover:translate-x-12 duration-1000" />
             <div className="relative z-10 max-w-3xl">
               <span className="text-emerald-400 font-black text-sm uppercase tracking-[0.4em] mb-6 block">Renewable Enterprise</span>
               <h2 className="text-4xl md:text-7xl font-display font-black mb-8 leading-tight">
                 Powering Jamaica's <br />
                 <span className="text-cta italic">Commercial Growth</span>
               </h2>
               <p className="text-slate-400 text-xl mb-12 max-w-xl leading-relaxed">
                 From multi-story resorts to industrial manufacturing facilities, we deliver high-capacity energy solutions that transform operational costs into profit hubs.
               </p>
               <div className="flex flex-wrap gap-6">
                 <Link to="/commercial" className="btn-cta px-10 py-5 text-xl">
                   Consult Our Engineers
                 </Link>
                 <Link to="/about" className="flex items-center gap-3 font-bold border-b-2 border-white/20 hover:border-cta transition-all py-2">
                   Download Capability Statement <ArrowRight size={20} />
                 </Link>
               </div>
             </div>
             <div className="absolute right-0 bottom-0 top-0 w-2/5 hidden xl:block opacity-60">
                <img 
                  src="https://picsum.photos/seed/enterprise/1000/1000" 
                  alt="Commercial" 
                  className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-secondary via-secondary/20 to-transparent" />
             </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
