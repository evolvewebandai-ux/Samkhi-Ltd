import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, CheckCircle2, AlertTriangle, HelpCircle, Share2 } from 'lucide-react';

interface SEOTabProps {
  productName: string;
  productDescription: string;
  productImage: string;
  seoTitle: string;
  setSeoTitle: (v: string) => void;
  seoDescription: string;
  setSeoDescription: (v: string) => void;
  seoSlug: string;
  setSeoSlug: (v: string) => void;
}

export default function SEOTab({
  productName,
  productDescription,
  productImage,
  seoTitle,
  setSeoTitle,
  seoDescription,
  setSeoDescription,
  seoSlug,
  setSeoSlug
}: SEOTabProps) {
  const [socialNetwork, setSocialNetwork] = useState<'facebook' | 'twitter'>('facebook');

  // Sync default values on load if the customized SEO is empty
  useEffect(() => {
    if (!seoTitle && productName) {
      setSeoTitle(productName);
    }
    if (!seoSlug && productName) {
      setSeoSlug(
        productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
    if (!seoDescription && productDescription) {
      const plain = productDescription.substring(0, 155);
      setSeoDescription(plain);
    }
  }, [productName, productDescription]);

  // Clean slug format
  const handleSlugChange = (v: string) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSeoSlug(clean);
  };

  // Live SEO scoring logic
  // Score parameters:
  // - Title length: 40-60 chars (30 pts)
  // - Description length: 120-160 chars (30 pts)
  // - Slug exists & clean (20 pts)
  // - Images configured / keyword checks (20 pts)
  const titleLen = seoTitle.length;
  const descLen = seoDescription.length;

  let score = 0;
  const checklists: { id: string; name: string; score: number; passed: boolean; message: string }[] = [];

  // Title check
  const titlePassed = titleLen >= 30 && titleLen <= 60;
  score += titlePassed ? 30 : titleLen > 0 ? 15 : 0;
  checklists.push({
    id: 'title',
    name: 'SEO Page Title Length',
    score: 30,
    passed: titlePassed,
    message: titlePassed 
      ? `Ideal length (${titleLen} characters)` 
      : titleLen === 0 
        ? 'Missing page title (0 characters)' 
        : `Title is too ${titleLen < 30 ? 'short' : 'long'} (${titleLen} chars). Keep between 30 and 60.`
  });

  // Description check
  const descPassed = descLen >= 120 && descLen <= 160;
  score += descPassed ? 30 : descLen > 0 ? 15 : 0;
  checklists.push({
    id: 'desc',
    name: 'Meta Description Length',
    score: 30,
    passed: descPassed,
    message: descPassed 
      ? `Ideal length (${descLen} characters)` 
      : descLen === 0
        ? 'Missing description (0 characters)'
        : `Description is ${descLen < 120 ? 'too short' : 'too long'} (${descLen} chars). Keep between 120 and 160.`
  });

  // Slug check
  const slugPassed = seoSlug.length > 3 && !seoSlug.includes('_') && !/[A-Z]/.test(seoSlug);
  score += slugPassed ? 20 : seoSlug.length > 0 ? 10 : 0;
  checklists.push({
    id: 'slug',
    name: 'URL Route Slug Format',
    score: 20,
    passed: slugPassed,
    message: slugPassed 
      ? 'URL is structured correctly (lowercase and hyphens only)'
      : seoSlug.length === 0 
        ? 'Slug cannot be left empty!' 
        : 'Ensure slug contains no capitals or underscores.'
  });

  // Media check
  const mediaPassed = !!productImage && productImage.startsWith('http');
  score += mediaPassed ? 20 : 0;
  checklists.push({
    id: 'media',
    name: 'OG Preview Rich Image',
    score: 20,
    passed: mediaPassed,
    message: mediaPassed ? 'Valid metadata preview image linked' : 'No product image loaded or linked.'
  });

  return (
    <div className="space-y-6">
      {/* Overview SEO Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#f9f9f9] border border-[#e3e3e3] rounded-xl p-5 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-[#616161] font-bold uppercase tracking-wider mb-2">SEO Health Score</span>
          <div className="relative flex items-center justify-center">
            {/* SVG circle meter */}
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#f1f1f1" strokeWidth="8" fill="transparent" />
              <circle 
                cx="48" 
                cy="48" 
                r="40" 
                stroke={score >= 80 ? '#00a15f' : score >= 50 ? '#d97706' : '#dc2626'} 
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray={`${2.51 * 40}`} 
                strokeDashoffset={`${2.51 * 40 * (1 - score / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute text-2xl font-black text-[#1a1a1a]">{score}%</div>
          </div>
          <span className="text-[11px] font-semibold mt-3 text-[#1a1a1a]">
            {score >= 80 ? 'Excellent Optimization' : score >= 50 ? 'Needs Tweaking' : 'Poor Quality'}
          </span>
        </div>

        <div className="md:col-span-2 bg-white border border-[#e3e3e3] rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">SEO Checklist & Impact</h4>
          <div className="space-y-2">
            {checklists.map((check) => (
              <div key={check.id} className="flex gap-3 items-start text-xs text-[#1a1a1a]">
                {check.passed ? (
                  <CheckCircle2 size={16} className="text-[#00a15f] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">{check.name}</span>
                  <span className="mx-2 text-[#616161]">({check.score} pts)</span>
                  <p className="text-[11px] text-[#616161] mt-0.5 leading-relaxed">{check.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="bg-white border border-[#e3e3e3] rounded-xl p-5 space-y-4">
        <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Search Engine Listing Customization</h4>
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-[#616161]">
            <label className="font-bold text-[#1a1a1a]">Page Title</label>
            <span className={titlePassed ? 'text-emerald-700 font-semibold' : 'text-amber-600'}>
              {titleLen} / 60 chars (optimal: 30-60)
            </span>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={e => setSeoTitle(e.target.value.substring(0, 100))}
            placeholder="e.g. Premium 200W Monocrystalline Solar Panel - Samkhi Limited"
            className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-[#616161]">
            <label className="font-bold text-[#1a1a1a]">Meta Description</label>
            <span className={descPassed ? 'text-emerald-700 font-semibold' : 'text-amber-600'}>
              {descLen} / 160 chars (optimal: 120-160)
            </span>
          </div>
          <textarea
            rows={3}
            value={seoDescription}
            onChange={e => setSeoDescription(e.target.value.substring(0, 250))}
            placeholder="Purchase top tier monocrystalline solar panel kits from Samkhi Limited. Rated 200W with smart converters and waterproof coating. Order today!"
            className="w-full border border-[#d1d1d1] rounded-lg px-3 py-1.5 text-sm outline-none resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-[#616161]">
            <label className="font-bold text-[#1a1a1a]">URL Route Slug</label>
            <span>Hyphens only, lowercase</span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#b5b5b5]">
              samkhi.com/products/
            </span>
            <input
              type="text"
              value={seoSlug}
              onChange={e => handleSlugChange(e.target.value)}
              className="w-full border border-[#d1d1d1] rounded-lg pl-36 pr-3 py-1.5 text-xs outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Previews Tabs */}
      <div className="bg-white border border-[#e3e3e3] rounded-xl overflow-hidden shadow-xs">
        <div className="bg-[#f9f9f9] border-b border-[#e3e3e3] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#1a1a1a]">
            <Globe size={14} className="text-[#005bd3]" />
            <span className="text-xs font-bold uppercase tracking-wider">Visual Live Renders</span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setSocialNetwork('facebook')}
              className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                socialNetwork === 'facebook' ? 'bg-black text-white' : 'text-[#616161] hover:text-black'
              }`}
            >
              Google & FB Card
            </button>
            <button
              type="button"
              onClick={() => setSocialNetwork('twitter')}
              className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                socialNetwork === 'twitter' ? 'bg-black text-white' : 'text-[#616161] hover:text-black'
              }`}
            >
              Twitter Card
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Google SERP Preview */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#616161] uppercase tracking-wider block">Google Search Preview</span>
            <div className="bg-white border border-[#f1f1f1] rounded-lg p-4 font-sans text-left max-w-xl">
              <div className="text-xs text-[#202124] flex items-center gap-1 truncate mb-0.5">
                <span className="bg-[#f1f3f4] p-1 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-semibold text-black">
                  s
                </span>
                <span>https://samkhi.com &rsaquo; products &rsaquo; {seoSlug || 'product-slug'}</span>
              </div>
              <h3 className="text-lg text-[#1a0dab] font-medium hover:underline cursor-pointer truncate mb-1">
                {seoTitle || 'Product Title placeholder...'}
              </h3>
              <p className="text-xs text-[#4d5156] leading-relaxed line-clamp-2">
                {seoDescription || 'Description placeholder. Make sure you populate details to provide context...'}
              </p>
            </div>
          </div>

          <hr className="border-[#f1f1f1]" />

          {/* Social Network Card Preview */}
          {socialNetwork === 'facebook' ? (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#616161] uppercase tracking-wider block">Facebook Rich Link Preview</span>
              <div className="border border-[#e3e3e3] rounded-xl overflow-hidden font-sans max-w-md bg-white">
                <div className="aspect-video w-full bg-[#f9f9f9] border-b border-[#e3e3e3] flex items-center justify-center overflow-hidden">
                  {productImage ? (
                    <img src={productImage} alt="Social share" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-[#b5b5b5]">No OG Image Configured</div>
                  )}
                </div>
                <div className="p-3 bg-[#f2f3f5] text-left">
                  <span className="text-[10px] text-[#606770] uppercase">SAMKHI.COM</span>
                  <h4 className="text-xs font-bold text-[#1d2129] mt-0.5 truncate">{seoTitle || productName}</h4>
                  <p className="text-[11px] text-[#606770] mt-0.5 line-clamp-1">{seoDescription || productDescription}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#616161] uppercase tracking-wider block">Twitter Summary Card Preview</span>
              <div className="border border-[#e3e3e3] rounded-2xl overflow-hidden font-sans max-w-md bg-white flex items-center h-28 text-left">
                <div className="w-1/3 h-full bg-[#f9f9f9] border-r border-[#e3e3e3] flex items-center justify-center overflow-hidden shrink-0">
                  {productImage ? (
                    <img src={productImage} alt="Social share" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-[9px] text-[#b5b5b5]">No Image</div>
                  )}
                </div>
                <div className="p-3 w-2/3 truncate">
                  <span className="text-[10px] text-[#657786]">samkhi.com</span>
                  <h4 className="text-[11px] font-bold text-black truncate mt-0.5">{seoTitle || productName}</h4>
                  <p className="text-[10px] text-[#657786] leading-relaxed mt-0.5 line-clamp-2">{seoDescription || productDescription}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
