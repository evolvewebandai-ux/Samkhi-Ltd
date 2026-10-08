import React, { useState, useEffect } from 'react';
import { Collection } from '../types';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const FALLBACK_SOLAR_IMAGE = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=800';

const CATEGORY_FALLBACKS: Record<string, string> = {
  'solar-inverters': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=800',
  'backup-generators': 'https://images.unsplash.com/photo-1548611716-300181be3912?auto=format&fit=crop&q=80&w=800',
  'solar-batteries': 'https://images.unsplash.com/photo-1558441719-6705166e2106?auto=format&fit=crop&q=80&w=800',
  'solar-water-heaters': 'https://images.unsplash.com/photo-1584271854089-9bb3e5178d42?auto=format&fit=crop&q=80&w=800',
  'solar-lighting-security': 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&q=80&w=800',
  'accessories': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800',
  'solar-panels': 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=800',
};

const CollectionCard: React.FC<{ collection: any }> = ({ collection }) => {
  const defaultForCategory = CATEGORY_FALLBACKS[collection.id] || FALLBACK_SOLAR_IMAGE;
  const initialImage = collection.image_url || collection.imageUrl || collection.coverImage || defaultForCategory;

  const [imgSrc, setImgSrc] = useState<string>(initialImage);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const freshImage = collection.image_url || collection.imageUrl || collection.coverImage || defaultForCategory;
    setImgSrc(freshImage);
    setHasError(false);
  }, [collection.image_url, collection.imageUrl, collection.coverImage, collection.id]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(defaultForCategory);
    }
  };

  return (
    <Link to={`/shop?collection=${collection.id}`} className="block">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="group relative h-80 rounded-3xl overflow-hidden shadow-enterprise hover:shadow-[0_20px_45px_rgba(16,185,129,0.18)] border border-slate-100/50 flex flex-col justify-end transition-all duration-500 cursor-pointer"
      >
        {/* Top brand-accent color slide-in border */}
        <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-emerald-500 to-teal-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left z-20" />
        
        <img 
          src={imgSrc} 
          alt={collection.title || 'Collection'} 
          onError={handleError}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/95 via-secondary/30 to-transparent" />
        
        <div className="relative p-8 text-white">
          <h3 className="text-2xl font-display font-black mb-6 tracking-tight transition-transform duration-300 ease-out group-hover:translate-x-1.5">{collection.title}</h3>
          <div 
            className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold text-xs uppercase tracking-widest border border-white/20 group-hover:bg-cta group-hover:text-secondary group-hover:border-cta transition-all duration-300"
          >
            Browse Products
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default CollectionCard;
