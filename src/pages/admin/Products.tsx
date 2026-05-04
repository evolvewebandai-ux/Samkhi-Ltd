import React, { useState, useRef } from 'react';
import { PRODUCTS } from '../../data';
import { Search, SlidersHorizontal, ChevronDown, Check, X, MoreHorizontal, ExternalLink, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminProducts() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = ['All', 'Inverters', 'Batteries', 'LED Lighting', 'Solar Panels'];

  const filteredProducts = PRODUCTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = filter === 'All' || p.category.toLowerCase().includes(filter.toLowerCase().replace(' ', '-'));
    return matchesSearch && matchesTab;
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Products</h1>
        <div className="flex gap-2">
          <button className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#f6f6f6] transition-colors">
            Export
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-black text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-black/90 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} />
            Add product
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#e3e3e3]"
            >
              <div className="p-6 border-b border-[#e3e3e3] flex justify-between items-center">
                <h3 className="font-bold text-[#1a1a1a]">Add New Product</h3>
                <button onClick={() => setIsAdding(false)}><X size={20} className="text-[#616161]" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Media</label>
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
                      isDragging ? "border-black bg-black/5" : "border-[#d1d1d1] hover:bg-[#f9f9f9]",
                      selectedImage ? "p-0 overflow-hidden border-solid border-[#e3e3e3] aspect-video" : ""
                    )}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {selectedImage ? (
                      <div className="relative w-full h-full group">
                        <img src={selectedImage} alt="Preview" className="w-full h-full object-contain bg-[#f9f9f9]" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="bg-white text-black p-2 rounded-full hover:scale-110 transition-transform"
                          >
                            <ImageIcon size={18} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(null);
                            }}
                            className="bg-white text-red-500 p-2 rounded-full hover:scale-110 transition-transform"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-[#f1f1f1] flex items-center justify-center text-[#616161]">
                          <Upload size={20} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-[#1a1a1a]">Click to upload or drag and drop</p>
                          <p className="text-xs text-[#616161]">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Title</label>
                  <input type="text" className="w-full border border-[#d1d1d1] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5" placeholder="Short description name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Price</label>
                    <input type="number" className="w-full border border-[#d1d1d1] rounded-md px-3 py-2 text-sm outline-none" placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#616161] uppercase tracking-wider">Stock</label>
                    <input type="number" className="w-full border border-[#d1d1d1] rounded-md px-3 py-2 text-sm outline-none" placeholder="0" />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-[#f9f9f9] border-t border-[#e3e3e3] flex justify-end gap-3">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium hover:bg-[#f1f1f1] rounded-md">Cancel</button>
                <button className="bg-black text-white px-4 py-2 rounded-md font-bold text-sm">Save product</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-lg border border-[#e3e3e3] shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-[#e3e3e3] px-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                filter === tab 
                  ? "border-black text-[#1a1a1a]" 
                  : "border-transparent text-[#616161] hover:text-[#1a1a1a] hover:bg-[#f6f6f6]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="p-2 flex gap-2 border-b border-[#e3e3e3] bg-[#f9f9f9]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#616161]" size={16} />
            <input 
              type="text" 
              placeholder="Filter products"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-[#d1d1d1] rounded-md py-1 pl-8 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-[#f9f9f9] text-[#616161] text-xs font-semibold uppercase tracking-wider border-b border-[#e3e3e3]">
              <tr>
                <th className="px-4 py-2 w-10">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Inventory</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-[#e3e3e3] hover:bg-[#f9f9f9] transition-colors group cursor-pointer text-sm">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded" onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded border border-[#e3e3e3] bg-white overflow-hidden shrink-0">
                        <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#1a1a1a] group-hover:underline line-clamp-1">{product.name}</div>
                        <div className="text-[#616161] text-xs">${product.price.toLocaleString()} JMD</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      product.inStock 
                        ? "bg-[#ccf2e5] text-[#006e52]" 
                        : "bg-[#ffd5d8] text-[#8e1f0b]"
                    )}>
                      {product.inStock ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={cn(
                      product.inStock ? "text-[#1a1a1a]" : "text-[#8e1f0b] font-medium"
                    )}>
                      {product.inStock ? '99+' : '0'} in stock
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#616161]">
                    {product.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1 hover:bg-[#e3e3e3] rounded text-[#616161]">
                       <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                   <td colSpan={6} className="px-4 py-20 text-center text-[#616161]">
                      No products found matching your filters.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f9f9f9] flex justify-center text-sm border-t border-[#e3e3e3]">
          <div className="flex gap-1 text-[#616161]">
            Showing <span className="font-medium text-[#1a1a1a]">1-{filteredProducts.length}</span> of <span className="font-medium text-[#1a1a1a]">{filteredProducts.length}</span> products
          </div>
        </div>
      </div>
    </div>
  );
}
