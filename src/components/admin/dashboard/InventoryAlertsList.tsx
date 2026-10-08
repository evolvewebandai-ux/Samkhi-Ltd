import React, { useState } from 'react';
import { useInventory } from '../../../context/InventoryContext';
import { useProducts } from '../../../context/ProductContext';
import { ShieldCheck, Zap, Plus, Minus, X, RefreshCw } from 'lucide-react';
import { showToast } from '../../../lib/toast';

/**
 * InventoryAlertsList in Gentelella styling
 * Lists out-of-stock and low-stock SKUs with inline quick adjustment
 * styled with Gentelella colors (#2A3F54 text, #26B99A green buttons).
 */
export default function InventoryAlertsList() {
  const { inventoryLevels, bulkAdjustLevels } = useInventory();
  const { products } = useProducts();
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState<number>(10);
  const [loading, setLoading] = useState(false);

  // Filter alerts
  const outOfStock = inventoryLevels.filter(lvl => (lvl.quantityAvailable || 0) <= 0);
  const lowStock = inventoryLevels.filter(lvl => {
    const qty = lvl.quantityAvailable || 0;
    return qty > 0 && qty <= (lvl.lowStockThreshold || 5);
  });

  const getProductDetails = (prodId: string, variantId?: string) => {
    const prod = products.find(p => p.id === prodId);
    const vrnt = prod?.variants?.find(v => v.id === variantId);
    return {
      name: prod?.name || 'Solar Equipment',
      variantLabel: vrnt ? vrnt.title : '',
      sku: (variantId ? vrnt?.sku : prod?.id) || 'SKU'
    };
  };

  const handleQuickAdjustment = async (lvlId: string) => {
    if (adjustmentValue <= 0) {
      showToast('Adjustment quantity must be greater than zero', 'warning');
      return;
    }
    setLoading(true);
    try {
      await bulkAdjustLevels([{
        id: lvlId,
        delta: Number(adjustmentValue),
        notes: 'Quick check-in from Admin Dashboard Alerts Launcher',
        type: 'adjusted',
        refType: 'adjustment'
      }]);
      showToast('Stock level adjusted successfully!', 'success');
      setAdjustingId(null);
    } catch (e) {
      console.error(e);
      showToast('Failed to adjust stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasAlerts = outOfStock.length > 0 || lowStock.length > 0;

  return (
    <div className="space-y-3 font-sans text-xs">
      {!hasAlerts ? (
        <div className="bg-[#1ABB9C]/10 border border-[#1ABB9C]/30 rounded-[3px] p-6 text-center text-[#2A3F54]">
          <ShieldCheck className="mx-auto mb-2 text-[#1ABB9C]" size={32} />
          <h4 className="text-xs font-bold uppercase tracking-wider">All Stock Levels Healthy</h4>
          <p className="text-[11px] text-[#73879C] mt-1">All inventory coordinates match recorded thresholds.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 no-scrollbar text-xs">
          {/* Out of Stock (Red) */}
          {outOfStock.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#E74C3C] uppercase tracking-wider pb-1 border-b border-rose-200">
                <span className="w-2 h-2 rounded-full bg-[#E74C3C] shrink-0" />
                Out of Stock ({outOfStock.length})
              </div>
              {outOfStock.map((lvl) => {
                const details = getProductDetails(lvl.productId, lvl.variantId);
                const isAdjusting = adjustingId === lvl.id;

                return (
                  <div key={lvl.id} className="bg-white border border-[#E6E9ED] hover:border-[#E74C3C]/50 rounded-[3px] p-2.5 transition-all flex flex-col justify-between gap-2 shadow-2xs">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="font-bold text-[#2A3F54] leading-normal">{details.name}</div>
                        {details.variantLabel && (
                          <div className="text-[10px] text-[#E74C3C] font-semibold mt-0.5">{details.variantLabel}</div>
                        )}
                        <div className="text-[10px] text-[#73879C] font-mono tracking-tight mt-0.5">{details.sku}</div>
                      </div>
                      {!isAdjusting && (
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingId(lvl.id);
                            setAdjustmentValue(lvl.reorderQuantity || 10);
                          }}
                          className="px-2.5 py-1 bg-[#26B99A] hover:bg-[#20967D] text-white rounded-[3px] text-[10px] font-bold active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                        >
                          <Zap size={11} />
                          Restock
                        </button>
                      )}
                    </div>

                    {isAdjusting && (
                      <div className="bg-[#F9F9F9] border border-[#E6E9ED] rounded-[3px] p-2 mt-1 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#73879C]">
                          <span>Adjust quantity on hand:</span>
                          <button type="button" onClick={() => setAdjustingId(null)}>
                            <X size={12} className="text-[#73879C] hover:text-[#2A3F54]" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setAdjustmentValue(prev => Math.max(1, prev - 1))}
                            className="p-1 border border-[#CCCCCC] text-[#2A3F54] rounded-[3px] bg-white cursor-pointer hover:bg-slate-50"
                          >
                            <Minus size={12} />
                          </button>
                          <input 
                            type="number"
                            value={adjustmentValue}
                            onChange={e => setAdjustmentValue(Number(e.target.value))}
                            className="w-14 text-center border border-[#CCCCCC] rounded-[3px] py-0.5 font-bold font-mono text-xs bg-white text-[#2A3F54]"
                          />
                          <button 
                            type="button"
                            onClick={() => setAdjustmentValue(prev => prev + 1)}
                            className="p-1 border border-[#CCCCCC] text-[#2A3F54] rounded-[3px] bg-white cursor-pointer hover:bg-slate-50"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustment(lvl.id)}
                            disabled={loading}
                            className="flex-1 bg-[#26B99A] hover:bg-[#20967D] text-white py-1 rounded-[3px] text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {loading ? <RefreshCw className="animate-spin" size={10} /> : <Plus size={11} />}
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Low Stock (Amber) */}
          {lowStock.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#F39C12] uppercase tracking-wider pb-1 border-b border-amber-200">
                <span className="w-2 h-2 rounded-full bg-[#F39C12] shrink-0" />
                Low Stock ({lowStock.length})
              </div>
              {lowStock.map((lvl) => {
                const details = getProductDetails(lvl.productId, lvl.variantId);
                const isAdjusting = adjustingId === lvl.id;

                return (
                  <div key={lvl.id} className="bg-white border border-[#E6E9ED] hover:border-[#F39C12]/50 rounded-[3px] p-2.5 transition-all flex flex-col justify-between gap-2 shadow-2xs">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="font-bold text-[#2A3F54] leading-normal">{details.name}</div>
                        {details.variantLabel && (
                          <div className="text-[10px] text-[#F39C12] font-semibold mt-0.5">{details.variantLabel}</div>
                        )}
                        <div className="text-[10px] mt-0.5 flex items-center gap-1.5">
                          <span className="text-[#73879C] font-mono tracking-tight">{details.sku}</span>
                          <span className="font-bold text-[#F39C12] bg-amber-50 px-1.5 py-0.2 rounded font-mono text-[9px] border border-amber-200">
                            {lvl.quantityAvailable} units left
                          </span>
                        </div>
                      </div>
                      {!isAdjusting && (
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingId(lvl.id);
                            setAdjustmentValue(lvl.reorderQuantity || 10);
                          }}
                          className="px-2.5 py-1 bg-[#26B99A] hover:bg-[#20967D] text-white rounded-[3px] text-[10px] font-bold active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                        >
                          <Zap size={11} />
                          Restock
                        </button>
                      )}
                    </div>

                    {isAdjusting && (
                      <div className="bg-[#F9F9F9] border border-[#E6E9ED] rounded-[3px] p-2 mt-1 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#73879C]">
                          <span>Adjust quantity on hand:</span>
                          <button type="button" onClick={() => setAdjustingId(null)}>
                            <X size={12} className="text-[#73879C] hover:text-[#2A3F54]" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setAdjustmentValue(prev => Math.max(1, prev - 1))}
                            className="p-1 border border-[#CCCCCC] text-[#2A3F54] rounded-[3px] bg-white cursor-pointer hover:bg-slate-50"
                          >
                            <Minus size={12} />
                          </button>
                          <input 
                            type="number"
                            value={adjustmentValue}
                            onChange={e => setAdjustmentValue(Number(e.target.value))}
                            className="w-14 text-center border border-[#CCCCCC] rounded-[3px] py-0.5 font-bold font-mono text-xs bg-white text-[#2A3F54]"
                          />
                          <button 
                            type="button"
                            onClick={() => setAdjustmentValue(prev => prev + 1)}
                            className="p-1 border border-[#CCCCCC] text-[#2A3F54] rounded-[3px] bg-white cursor-pointer hover:bg-slate-50"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustment(lvl.id)}
                            disabled={loading}
                            className="flex-1 bg-[#26B99A] hover:bg-[#20967D] text-white py-1 rounded-[3px] text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {loading ? <RefreshCw className="animate-spin" size={10} /> : <Plus size={11} />}
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
