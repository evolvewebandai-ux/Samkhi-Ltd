import React from 'react';
import { SolarPackage } from '../types';
import { CheckCircle2, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const SolarPackageCard: React.FC<{ pkg: SolarPackage }> = ({ pkg }) => {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-[2.5rem] p-10 shadow-enterprise border border-slate-100 relative group overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-12 translate-x-12 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
      
      {pkg.badge && (
        <div className="absolute -top-1 left-10">
          <div className="bg-emerald-500 text-white font-black px-6 py-2 rounded-b-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg">
            {pkg.badge}
          </div>
        </div>
      )}
      
      <div className="mb-10 pt-4">
        <h3 className="text-3xl font-display font-black text-secondary mb-3 tracking-tight">{pkg.name}</h3>
        <p className="text-slate-500 text-base leading-relaxed">{pkg.description}</p>
      </div>

      <div className="bg-surface rounded-[2rem] p-8 mb-10 text-center border border-slate-100 group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-all duration-500">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-white/60">Estimated Investment</p>
        <div className="flex items-center justify-center gap-1 group-hover:text-white transition-colors">
          <span className="text-2xl font-bold opacity-40">J$</span>
          <span className="text-6xl font-display font-black tracking-tighter">{(pkg.price / 1000).toFixed(0)}k</span>
        </div>
      </div>

      <div className="space-y-4 mb-12">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Package Inclusions</p>
        {pkg.includes.map((item, idx) => (
          <div key={idx} className="flex gap-4 text-sm font-bold text-secondary group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: `${idx * 50}ms` }}>
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-white group-hover:text-emerald-600 transition-colors">
              <CheckCircle2 size={14} className="stroke-[3]" />
            </div>
            {item}
          </div>
        ))}
      </div>

      <Link 
        to="/solar#quote"
        className="w-full btn-secondary py-5 rounded-[1.25rem] flex items-center justify-center gap-3 text-lg font-black uppercase tracking-widest relative overflow-hidden group/btn px-4"
      >
        <span className="relative z-10 font-black">Plan Installation</span>
        <Zap size={20} className="relative z-10 text-cta fill-cta group-hover/btn:scale-125 transition-transform" />
        <div className="absolute inset-0 bg-emerald-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
      </Link>
    </motion.div>
  );
}

export default SolarPackageCard;
