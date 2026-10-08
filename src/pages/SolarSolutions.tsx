import { motion } from 'motion/react';
import { Sun, CheckCircle2, Zap, ArrowRight, ShieldCheck, BarChart3, CloudSun, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import SolarQuoteForm from '../components/SolarQuoteForm';

export default function SolarSolutions() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-24 bg-secondary text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/solarbg/1920/1080" 
            alt="Solar" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-secondary" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 rounded-full text-cta text-xs font-bold uppercase tracking-wider mb-8 border border-primary/30"
            >
              Certified Solar Specialists in Jamaica
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-display font-black mb-8 leading-tight">
               Independence Starts <br />
               <span className="text-cta">With The Sun</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              Tired of rising JPS costs? Samkhi Limited provides end-to-end solar solutions—from site assessment to professional installation—helping you generate your own clean, reliable electricity.
            </p>
            <div className="flex flex-wrap gap-4">
               <a href="#quote" className="btn-cta text-lg px-10 border border-cta">Get A Custom Quote</a>
               <a href="#process" className="btn-secondary border border-white/20 text-lg">Our 4-Step Process</a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-black text-secondary mb-6">The Samkhi Advantage</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">We don't just sell equipment; we deliver long-term energy security backed by technical expertise and local support.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: ShieldCheck,
                title: "Tier 1 Components",
                desc: "We exclusively use proven brands like JA Solar, Deye, and Suntec to ensure your system lasts for decades."
              },
              {
                icon: Clock,
                title: "Fast Turnaround",
                desc: "Our stocked inventory means no long waits for shipping. We can deploy typical residential systems in days, not months."
              },
              {
                icon: BarChart3,
                title: "Maximize ROI",
                desc: "Our engineers design systems to ensure the quickest payback period, often seeing full return within 3-5 years."
              }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center p-8 bg-surface rounded-3xl group hover:bg-primary transition-all duration-300">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary mb-6 shadow-md shadow-primary/5 group-hover:bg-primary-accent group-hover:text-white transition-colors">
                  <feature.icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-4 group-hover:text-white">{feature.title}</h3>
                <p className="text-slate-500 group-hover:text-primary-accent group-hover:brightness-200">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Process */}
      <section id="process" className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-black text-secondary mb-6">Our 4-Step Process</h2>
            <p className="text-slate-500">How we take you from high energy bills to energy independence.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Consultation", desc: "We review your JPS bills and energy goals." },
              { step: "02", title: "Design", desc: "Our engineers design a custom system for your roof." },
              { step: "03", title: "Installation", desc: "Certified technicians install your system with precision." },
              { step: "04", title: "Monitoring", desc: "Full app access to track your production and savings." }
            ].map((s, i) => (
              <div key={i} className="relative p-8 rounded-3xl bg-surface border border-slate-100 flex flex-col items-center">
                 <span className="absolute -top-6 left-8 text-6xl font-display font-black text-slate-100 italic">{s.step}</span>
                 <h3 className="relative z-10 text-xl font-bold text-secondary mb-4 mt-4">{s.title}</h3>
                 <p className="relative z-10 text-slate-500 text-sm text-center">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Form */}
      <section id="quote" className="py-24 bg-secondary text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
             <div>
               <h2 className="text-4xl md:text-5xl font-display font-black mb-6">Start Your Journey Today</h2>
               <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                 Enter your details below and one of our energy specialists will reach out to schedule a free rooftop assessment.
               </p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <Sun className="text-cta mb-3" size={24} />
                    <p className="font-bold text-white uppercase text-xs tracking-widest mb-1">Savings</p>
                    <p className="text-slate-400 text-sm">Save thousands annually</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <CloudSun className="text-cta mb-3" size={24} />
                    <p className="font-bold text-white uppercase text-xs tracking-widest mb-1">Environment</p>
                    <p className="text-slate-400 text-sm">Reduce your carbon footprint</p>
                  </div>
               </div>
             </div>
             <div>
               <SolarQuoteForm />
             </div>
          </div>
        </div>
      </section>

    </div>
  );
}
