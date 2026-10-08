import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../../context/ProductContext';
import { Order } from '../../../types';
import { ArrowRight, Package } from 'lucide-react';

interface TopProductsListProps {
  orders: Order[];
}

/**
 * TopProductsList in Gentelella styling
 * Ranks top-selling products with clean #E6E9ED cards, #1ABB9C rank badges,
 * and high-contrast light typography.
 */
export default function TopProductsList({ orders }: TopProductsListProps) {
  const navigate = useNavigate();
  const { products } = useProducts();

  const topSellingProducts = useMemo(() => {
    const salesMap: Record<string, { productId: string; name: string; quantity: number; revenue: number }> = {};

    orders
      .filter(o => o.status !== 'cancelled')
      .forEach(o => {
        const items = o.lineItems || [];
        items.forEach((item: any) => {
          const prodId = item.productId || item.id;
          if (!prodId) return;

          const qty = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;

          if (!salesMap[prodId]) {
            salesMap[prodId] = {
              productId: prodId,
              name: item.productName || item.name || 'Solar Equipment',
              quantity: 0,
              revenue: 0
            };
          }
          salesMap[prodId].quantity += qty;
          salesMap[prodId].revenue += qty * price;
        });
      });

    return Object.values(salesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orders]);

  const getProductImage = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    return prod?.imageUrl || '';
  };

  return (
    <div className="space-y-2.5 font-sans">
      <div className="space-y-1.5 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
        {topSellingProducts.map((p, idx) => {
          const img = getProductImage(p.productId);
          return (
            <div 
              key={p.productId} 
              onClick={() => navigate(`/admin/products/${p.productId}`)}
              className="flex items-center justify-between p-2.5 rounded-[3px] border border-[#E6E9ED] hover:border-[#1ABB9C] bg-white shadow-2xs hover:shadow-xs cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-[#1ABB9C]/10 text-[#1ABB9C] font-bold text-[10px] font-mono flex items-center justify-center shrink-0 border border-[#1ABB9C]/30">
                  {idx + 1}
                </span>
                <div className="h-9 w-9 shrink-0 rounded-[3px] bg-[#F7F7F7] border border-[#E6E9ED] overflow-hidden flex items-center justify-center">
                  {img ? (
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package size={15} className="text-[#73879C]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#2A3F54] group-hover:text-[#1ABB9C] truncate leading-tight transition-colors">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-[#73879C] font-mono tracking-tight mt-0.5">
                    {p.quantity} units ordered
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-xs font-bold text-[#2A3F54] shrink-0 pl-2">
                ${(p.revenue || 0).toLocaleString()} <span className="text-[9px] text-[#73879C] font-sans font-normal">JMD</span>
              </div>
            </div>
          );
        })}
        {topSellingProducts.length === 0 && (
          <div className="text-center py-8 text-[#73879C] text-xs">
            No sales items recorded in this period.
          </div>
        )}
      </div>

      <div className="pt-1 flex justify-end">
        <button 
          type="button"
          onClick={() => navigate('/admin/products')}
          className="text-xs font-bold text-[#337AB7] hover:underline flex items-center gap-1 cursor-pointer"
        >
          View Full Catalog Listings
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
