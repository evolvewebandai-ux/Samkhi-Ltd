import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Search, 
  Upload, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  FileText, 
  Grid, 
  X, 
  Maximize2,
  File 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface MediaAsset {
  id: string;
  name: string;
  size: string;
  dimensions: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  url: string;
}

export default function AdminMediaLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Seed Media Assets
  const [mediaList, setMediaList] = useState<MediaAsset[]>([
    { id: 'm1', name: 'solar_panel_hybrid_monocrystalline.png', size: '1.2 MB', dimensions: '1200 x 900', mimeType: 'image/png', url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&auto=format&fit=crop&q=80' },
    { id: 'm2', name: 'lithium_battery_bank_lifepo4_48v.jpg', size: '890 KB', dimensions: '1024 x 1024', mimeType: 'image/jpeg', url: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=1024&auto=format&fit=crop&q=80' },
    { id: 'm3', name: 'waterproof_street_led_fixture_50w.jpg', size: '450 KB', dimensions: '800 x 600', mimeType: 'image/jpeg', url: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=800&auto=format&fit=crop&q=80' },
    { id: 'm4', name: 'samkhi_corporate_office_kingston.png', size: '2.5 MB', dimensions: '1920 x 1080', mimeType: 'image/png', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80' },
    { id: 'm5', name: 'sine_wave_hybrid_inverter_5kw.jpg', size: '610 KB', dimensions: '1200 x 1200', mimeType: 'image/jpeg', url: 'https://images.unsplash.com/photo-1558441719-ff34b0524a24?w=1200&auto=format&fit=crop&q=80' }
  ]);

  const filteredAssets = mediaList.filter(
    m => m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const deleteAsset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaList(mediaList.filter(m => m.id !== id));
    if (selectedAsset?.id === id) {
      setSelectedAsset(null);
    }
  };

  const triggerFileSelector = () => {
    fileInputRef.current?.click();
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    // Generate mock object representation for local rendering list
    const fileUrl = URL.createObjectURL(file);
    const mockMimeMap: Record<string, any> = {
      'image/jpeg': 'image/jpeg',
      'image/png': 'image/png',
      'image/webp': 'image/webp'
    };

    const newMedia: MediaAsset = {
      id: `m-${Math.random().toString(36).substring(2, 7)}`,
      name: file.name.replace(/[^a-zA-Z0-9_\.-]/g, '_'),
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      dimensions: '1200 x 800',
      mimeType: (mockMimeMap[file.type] || 'image/png'),
      url: fileUrl
    };

    setMediaList([newMedia, ...mediaList]);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8" id="media-library-platform">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-5 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="text-[#2563EB]" size={26} />
            Media Assets Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual workspace to store, upload, and organize product assets and marketing illustrations.
          </p>
        </div>

        {/* Directory Search & Toggle */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search assets by file name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#f1f5f9] border border-slate-300 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-blue-500 text-slate-900 font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-xs text-left">
        
        {/* Drag & Drop Upload + Grid */}
        <div className="lg:col-span-3 space-y-6">
          {/* File Upload Box */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all bg-slate-50 relative overflow-hidden cursor-pointer",
              isDragOver ? "border-blue-500 bg-blue-50/20" : "border-slate-300 hover:border-slate-400"
            )}
            onClick={triggerFileSelector}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleManualUpload}
              accept="image/png, image/jpeg, image/webp"
              className="hidden" 
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload size={32} className="text-slate-400 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 text-xs">Drag and drop brand image assets here</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Or click manually to browse local directories (PNG, JPG, WEBP compatible)</p>
              </div>
            </div>
          </div>

          {/* Grid list container */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4.5">
            {filteredAssets.map((asset) => (
              <div 
                key={asset.id} 
                onClick={() => setSelectedAsset(asset)}
                className={cn(
                  "bg-white rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-md flex flex-col group relative",
                  selectedAsset?.id === asset.id ? "ring-2 ring-blue-500 border-transparent shadow-md" : "border-slate-205"
                )}
              >
                <div className="h-32 bg-slate-100 relative overflow-hidden">
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-102 transition-transform" />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => deleteAsset(asset.id, e)}
                      className="p-1.5 bg-white/90 text-red-650 hover:bg-white rounded shadow-sm border border-slate-100 text-red-600"
                      title="Delete asset permanently"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <p className="font-bold text-slate-900 truncate tracking-tight">{asset.name}</p>
                  <p className="text-[10px] text-slate-450 font-mono text-slate-505 font-bold flex justify-between">
                    <span>{asset.dimensions}</span>
                    <span>{asset.size}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Asset details Panel */}
        <div className="lg:col-span-1">
          {selectedAsset ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm text-xs font-medium flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-bold font-mono text-[10px] text-slate-400 uppercase tracking-widest">Asset Parameters</span>
                  <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>

                {/* Micro preview */}
                <div className="h-36 bg-slate-50 border rounded-lg overflow-hidden relative">
                  <img src={selectedAsset.url} alt="" className="w-full h-full object-contain" />
                </div>

                {/* Specifications list */}
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-slate-500 font-bold">File Designation:</span>
                    <span className="font-bold text-slate-905 block truncate max-w-[150px]" title={selectedAsset.name}>{selectedAsset.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 font-mono">
                    <span className="text-slate-550 font-bold font-sans">Resolution:</span>
                    <span className="font-bold text-slate-900">{selectedAsset.dimensions}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 font-mono">
                    <span className="text-slate-550 font-bold font-sans">File Size count:</span>
                    <span className="font-semibold text-slate-900">{selectedAsset.size}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-slate-550 font-bold">MIME Format:</span>
                    <span className="font-mono bg-slate-100 text-[10px] px-1.5 py-0.2 rounded font-bold text-slate-700">{selectedAsset.mimeType}</span>
                  </div>
                </div>

                {/* URL coordinates copier box */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Copy Reference URI</span>
                  <div className="flex gap-1">
                    <input 
                      type="text" 
                      readOnly 
                      value={selectedAsset.url}
                      className="w-full bg-slate-50 border border-slate-350 px-2 py-1.5 rounded-lg text-slate-500 text-[10px] outline-none font-mono"
                    />
                    <button
                      onClick={() => handleCopyUrl(selectedAsset.url)}
                      className="bg-black hover:bg-slate-800 text-white p-2 rounded-lg shrink-0 flex items-center justify-center transition-all"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t">
                <button
                  onClick={(e) => deleteAsset(selectedAsset.id, e as any)}
                  className="w-full py-1.5 border hover:bg-red-50 text-red-650 hover:text-red-700 hover:border-red-100 rounded-lg font-bold flex items-center justify-center gap-1.5 text-red-655"
                >
                  <Trash2 size={13} />
                  Remove Asset
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-450 italic flex flex-col items-center justify-center py-20">
              <File size={32} className="text-slate-350 mb-2" />
              <p className="font-bold text-slate-800">No asset inspected</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Click any gallery item inside the directory grid to explore metadata properties.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
