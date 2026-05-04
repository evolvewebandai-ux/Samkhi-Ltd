import { motion } from 'motion/react';
import { ArrowRight, Zap, Lightbulb, Sun, ShieldCheck, ChevronRight, PlayCircle, Star, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRODUCTS, CATEGORIES, SOLAR_PACKAGES } from '../data';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import SolarPackageCard from '../components/SolarPackageCard';
import SolarQuoteForm from '../components/SolarQuoteForm';

export default function Home() {
  const featuredProducts = PRODUCTS.filter(p => p.isFeatured).slice(0, 4);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-secondary overflow-hidden grid-bg">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-2/3 h-full bg-primary/5 -skew-x-12 translate-x-32" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-secondary/80 via-secondary to-emerald-950/20" />
        <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
        
        <div className="max-w-7xl mx-auto px-4 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Jamaica's Sustainable Energy Leader
            </div>
            <h1 className="text-6xl md:text-8xl font-display font-black text-white leading-[0.95] mb-8 tracking-tight">
              Switch to Solar <br />
              <span className="text-cta italic">Save Today.</span>
            </h1>
            <p className="text-xl text-slate-400 mb-12 max-w-lg leading-relaxed font-medium">
              Enterprise-grade LED lighting and solar energy systems for Jamaica's leading homes and businesses. 
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/shop" className="btn-cta text-lg group">
                Shop Products
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/solar" className="btn-secondary text-lg border border-white/20">
                Request Solar Quote
                <Sun className="text-cta" size={20} />
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-secondary bg-slate-800 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/150?u=${i}`} alt="User" />
                  </div>
                ))}
              </div>
              <div className="text-slate-400 text-sm">
                <span className="text-white font-bold">500+</span> Customers Trusted in Jamaica
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
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
            
            {/* Floating Card */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 hidden sm:block"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 text-primary rounded-xl flex items-center justify-center">
                  <Zap size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Savings</p>
                  <p className="text-2xl font-black text-secondary">Up to 90%</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-white py-16 border-y border-slate-100 grid-bg">
        <div className="max-w-7xl mx-auto px-4">
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

      {/* Categories Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-xl">
              <h2 className="text-4xl font-display font-black text-secondary mb-4">Browse by Category</h2>
              <p className="text-slate-500 text-lg">Everything you need to power your project, from individual LED bulbs to full-scale solar arrays.</p>
            </div>
            <Link to="/shop" className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all">
              See All Category <ChevronRight size={20} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIES.slice(0, 4).map(cat => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-black uppercase tracking-[0.3em] text-xs">Featured Inventory</span>
            <h2 className="text-4xl md:text-5xl font-display font-black text-secondary mt-4 mb-6">Popular Lighting & Power</h2>
            <div className="w-24 h-1.5 bg-cta mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map(prod => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <Link to="/shop" className="btn-secondary px-10">
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* Solar Packages Section */}
      <section className="py-24 bg-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black text-secondary mb-6">Premium Solar Packages</h2>
            <p className="text-slate-500 text-lg">We've curated the best components into ready-to-install packages for a seamless transition to solar power.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
            {SOLAR_PACKAGES.map(pkg => (
              <SolarPackageCard key={pkg.id} pkg={pkg} />
            ))}
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
          <div>
            <div className="p-3 bg-white/10 rounded-2xl w-fit mb-8">
              <Sun className="text-cta" size={40} />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black mb-6">Get Your Professional Solar Recommendation</h2>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              Not sure what system you need? Our experts analyze your energy consumption to design a custom solution that maximizes your ROI and minimizes waste.
            </p>
            <div className="space-y-6">
              {[
                "Professional Site Assessment",
                "Customized Technical Proposals",
                "Flexible Financing Options",
                "Registered & Licensed Installers"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-cta rounded-full flex items-center justify-center text-secondary">
                    <ChevronRight size={14} className="stroke-[3]" />
                  </div>
                  <span className="font-bold">{item}</span>
                </div>
              ))}
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
