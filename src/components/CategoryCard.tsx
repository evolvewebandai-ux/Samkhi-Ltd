import React from 'react';
import { Category } from '../types';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const CategoryCard: React.FC<{ category: Category }> = ({ category }) => {
  const Icon = category.icon;

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group relative h-80 rounded-3xl overflow-hidden shadow-enterprise border border-slate-100 flex flex-col justify-end"
    >
      <img 
        src={category.imageUrl} 
        alt={category.name} 
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/20 to-transparent" />
      
      <div className="relative p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          {Icon && (
            <div className="w-12 h-12 bg-cta rounded-2xl text-secondary flex items-center justify-center shadow-lg transform -rotate-3 group-hover:rotate-0 transition-transform">
              <Icon size={24} />
            </div>
          )}
        </div>
        <h3 className="text-2xl font-display font-black mb-2 tracking-tight">{category.name}</h3>
        <p className="text-slate-300 text-sm line-clamp-2 mb-6 group-hover:text-white transition-colors leading-relaxed">
          {category.description}
        </p>
        <Link 
          to={`/shop?category=${category.id}`} 
          className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold text-xs uppercase tracking-widest border border-white/20 hover:bg-cta hover:text-secondary hover:border-cta transition-all"
        >
          View Collection
          <ArrowRight size={16} />
        </Link>
      </div>
    </motion.div>
  );
}

export default CategoryCard;
