import { motion } from 'motion/react';
import { Building2, Hotel, Factory, Store, CheckCircle2, ArrowRight, BarChart3, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import SolarQuoteForm from '../components/SolarQuoteForm';

export default function Commercial() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-secondary py-24 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-30 grayscale mix-blend-overlay">
          <img src="https://picsum.photos/seed/commh/1200/800" alt="Commercial" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
           <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-3xl"
           >
              <span className="text-cta font-black text-sm uppercase tracking-[0.3em] mb-4 block">Enterprise Solutions</span>
              <h1 className="text-5xl md:text-7xl font-display font-black leading-tight mb-8">
                Powering Jamaica's <br />
                <span className="text-cta">Largest Projects</span>
              </h1>
              <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                From luxury resorts to industrial warehouses, we design and deploy multi-megawatt solar arrays and smart LED systems that transform operational costs into profit.
              </p>
              <div className="flex gap-4">
                 <a href="#comm-form" className="btn-cta text-lg">Consult Our Team</a>
                 <Link to="/about" className="btn-secondary border border-white/20 text-lg">Our Capability Statement</Link>
              </div>
           </motion.div>
        </div>
      </section>

      {/* Sectors */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 text-center mb-16">
           <h2 className="text-4xl font-display font-black text-secondary mb-6">Sectors We Serve</h2>
           <p className="text-slate-500 max-w-2xl mx-auto">Customized technical engineering for Jamaica's leading industries.</p>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
           <SectorCard icon={Hotel} title="Hotels & Resorts" desc="Optimize guest comfort while slashing massive HVAC and lighting bills." />
           <SectorCard icon={Factory} title="Factories" desc="Uninterruptible power solutions for critical manufacturing processes." />
           <SectorCard icon={Building2} title="Developments" desc="Large-scale solar water heating and panel systems for new housing." />
           <SectorCard icon={Store} title="Retail Centers" desc="Premium display lighting and solar to increase commercial value." />
        </div>
      </section>

      {/* Why Commercial */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
           <div className="relative">
              <div className="aspect-[4/3] bg-primary rounded-[3rem] overflow-hidden shadow-2xl relative">
                  <img src="https://picsum.photos/seed/panelsc/1200/900" alt="Panels" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" />
              </div>
              <div className="absolute -top-10 -left-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hidden md:block">
                 <p className="text-4xl font-display font-black text-primary mb-1">90%</p>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bill Reduction Possible</p>
              </div>
           </div>
           <div>
              <h2 className="text-4xl font-display font-black text-secondary mb-8">Financial & Operational Security</h2>
              <div className="space-y-8">
                 <CommercialBenefit 
                   icon={BarChart3} 
                   title="Opex Elimination" 
                   desc="Convert your largest monthly expense (Electricity) into a fixed, predictable capital asset." 
                 />
                 <CommercialBenefit 
                   icon={ShieldCheck} 
                   title="Power Resilience" 
                   desc="Protect against grid fluctuations and outages with smart battery backup systems." 
                 />
                 <CommercialBenefit 
                   icon={Zap} 
                   title="ESG Incentives" 
                   desc="Position your brand as a sustainable leader in the Caribbean market." 
                 />
              </div>
           </div>
        </div>
      </section>

      {/* Case Study Mock */}
      <section className="py-24 bg-secondary text-white">
         <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-display font-bold mb-12 uppercase tracking-[0.2em] text-cta">Project Spotlight</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {[
                 { title: "Resort Solar Farm", val: "250kWp System", loc: "Ocho Rios" },
                 { title: "Shopping Plaza", val: "High-Efficiency LED Upgrade", loc: "Drax Hall" },
                 { title: "Apartment complex", val: "Solar Water Heating Node", loc: "St. Ann's Bay" }
               ].map((p, i) => (
                 <div key={i} className="p-8 border border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left">
                    <p className="text-primary-accent font-black text-xs uppercase tracking-widest mb-2">{p.loc}</p>
                    <h3 className="text-xl font-bold mb-4">{p.title}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-sm italic">
                       <CheckCircle2 size={16} className="text-cta" /> {p.val}
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Lead Form */}
      <section id="comm-form" className="py-32 bg-surface">
         <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white rounded-[3.5rem] shadow-enterprise overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-slate-100">
               <div className="p-10 md:p-20 bg-secondary text-white relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-primary/5 -skew-x-12 -translate-x-1/2" />
                  <div className="relative z-10">
                    <span className="text-cta font-black text-[10px] uppercase tracking-[0.4em] mb-6 block">Direct Consultation</span>
                    <h2 className="text-4xl md:text-5xl font-display font-black mb-8 leading-tight">Scale Your Savings <br/><span className="text-cta">Today.</span></h2>
                    <p className="text-slate-400 mb-12 text-lg leading-relaxed">
                      Our senior technical engineers are ready to design your enterprise system. Fill out the form and we'll reach out within one business day for a complex assessment.
                    </p>
                    <ul className="space-y-6">
                      <li className="flex items-center gap-4 text-sm font-bold group/item">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-cta group-hover/item:bg-cta group-hover/item:text-secondary transition-colors">
                          <CheckCircle2 size={18} className="stroke-[3]" />
                        </div> 
                        Custom ROI & Financial Projection
                      </li>
                      <li className="flex items-center gap-4 text-sm font-bold group/item">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-cta group-hover/item:bg-cta group-hover/item:text-secondary transition-colors">
                          <CheckCircle2 size={18} className="stroke-[3]" />
                        </div> 
                        Technical Site Structural Audit
                      </li>
                      <li className="flex items-center gap-4 text-sm font-bold group/item">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-cta group-hover/item:bg-cta group-hover/item:text-secondary transition-colors">
                          <CheckCircle2 size={18} className="stroke-[3]" />
                        </div> 
                        Factory-Direct Inventory Pricing
                      </li>
                    </ul>
                  </div>
               </div>
               <div className="p-6 md:p-12 lg:p-16 flex items-center bg-slate-50/30">
                  <SolarQuoteForm compact />
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}

function SectorCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:bg-secondary transition-all duration-300">
       <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-primary/20 group-hover:bg-primary-accent transition-colors">
          <Icon size={32} />
       </div>
       <h3 className="font-bold text-secondary text-xl mb-4 group-hover:text-white">{title}</h3>
       <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-300">{desc}</p>
    </div>
  );
}

function CommercialBenefit({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex gap-6 items-start group">
       <div className="w-14 h-14 bg-surface rounded-2xl border border-slate-100 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
          <Icon size={28} />
       </div>
       <div>
          <h4 className="font-bold text-secondary text-lg mb-2">{title}</h4>
          <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
       </div>
    </div>
  );
}
