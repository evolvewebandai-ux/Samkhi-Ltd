import { motion } from 'motion/react';
import { ShieldCheck, Target, Users, MapPin, Award, CheckCircle2 } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-secondary py-24 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/10 skew-x-12 translate-x-32" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl font-display font-black mb-8 leading-tight">
              Leading Jamaica's <br />
              <span className="text-cta italic">Energy Revolution</span>
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed">
              Founded to deliver reliable LED lighting and solar energy solutions across Jamaica. We combine international technology with local expertise to power a sustainable future.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
             <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl">
                <img src="https://picsum.photos/seed/store/800/1000" alt="Samkhi Store" className="w-full h-full object-cover" />
             </div>
             <div className="absolute -bottom-10 -right-10 bg-primary p-8 rounded-3xl text-white shadow-2xl hidden md:block max-w-xs">
                <p className="text-4xl font-display font-black mb-1">10+ Yrs</p>
                <p className="text-sm font-bold uppercase tracking-widest text-primary-accent brightness-150">Technical Experience</p>
             </div>
          </div>
          <div>
            <span className="text-primary font-black uppercase text-xs tracking-[0.3em]">Our Mission</span>
            <h2 className="text-4xl font-display font-black text-secondary mt-4 mb-8">Professional Grade Energy Solutions</h2>
            <div className="space-y-6 text-slate-500 leading-relaxed">
              <p>
                Samkhi Limited emerged from a simple observation: Jamaica's infrastructure needs high-quality, long-lasting energy solutions that can withstand our unique climate while significantly reducing operational costs.
              </p>
              <p>
                As an importer, distributor, and retailer, we've built a robust supply chain that ensures our customers—from homeowners to major commercial developers—always have access to the latest in LED and Solar technology without the wait.
              </p>
              <p>
                Today, with locations in Ocho Rios and Drax Hall, we serve the entire island with a focus on technical knowledge, customer trust, and inventory reliability.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mt-12">
               <div className="bg-surface p-6 rounded-2xl border border-slate-100 transition-hover duration-300 hover:border-primary/20">
                  <Target size={32} className="text-primary mb-4" />
                  <p className="font-bold text-secondary mb-2 text-lg">Our Goal</p>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Islandwide Energy Independence</p>
               </div>
               <div className="bg-surface p-6 rounded-2xl border border-slate-100 transition-hover duration-300 hover:border-primary/20">
                  <Users size={32} className="text-primary mb-4" />
                  <p className="font-bold text-secondary mb-2 text-lg">Our Team</p>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Certified Energy Professionals</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4">
           <div className="text-center mb-16">
              <h2 className="text-4xl font-display font-black text-secondary mb-6">Built on Trust</h2>
              <div className="w-24 h-1.5 bg-cta mx-auto rounded-full" />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Reliability", desc: "We stock what we sell. No long lead times for critical infrastructure.", icon: ShieldCheck },
                { title: "Expertise", desc: "Our technicians are trained on the latest lithium and inverter technology.", icon: Award },
                { title: "Sustainability", desc: "We are committed to reducing Jamaica's carbon footprint one installation at a time.", icon: CheckCircle2 }
              ].map((v, i) => (
                <div key={i} className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm text-center card-hover">
                   <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <v.icon size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-secondary mb-4">{v.title}</h3>
                   <p className="text-slate-500 leading-relaxed">{v.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                 <h2 className="text-4xl font-display font-black text-secondary mb-8">Serving You Locally</h2>
                  <div className="space-y-8">
                    <div className="flex gap-6 items-start">
                       <MapPin className="text-primary shrink-0" size={24} />
                       <div>
                          <p className="font-bold text-secondary text-xl mb-1 uppercase tracking-tighter">Ocho Rios Showroom</p>
                          <p className="text-slate-500">Shop C1, New Pineapple Shopping Centre, Main St</p>
                          <p className="text-primary font-bold text-sm mt-2">(876) 630-3350 / (876) 972-1952</p>
                       </div>
                    </div>
                    <div className="flex gap-6 items-start">
                       <MapPin className="text-primary shrink-0" size={24} />
                       <div>
                          <p className="font-bold text-secondary text-xl mb-1 uppercase tracking-tighter">Drax Hall Branch</p>
                          <p className="text-slate-500">Unit 8, 14 Drax Business Center, Drax Hall</p>
                          <div className="mt-2 text-primary font-bold text-sm">
                             <p>(876) 630-3231</p>
                             <p className="text-slate-400 font-medium lowercase">samkhi.draxhall@gmail.com</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="aspect-video bg-surface rounded-[2rem] border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden grayscale hover:grayscale-0 transition-all duration-700">
                 <img src="https://picsum.photos/seed/map/1200/800?grayscale" alt="Map" className="w-full h-full object-cover" />
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}
