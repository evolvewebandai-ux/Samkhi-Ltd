import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Truck, Store, ArrowRight } from 'lucide-react';
import OrderStatusBadge from '../OrderStatusBadge';
import { Order } from '../../../types';

interface RecentOrdersTableProps {
  orders: Order[];
}

/**
 * RecentOrdersTable in Gentelella styling
 * Crisp striped table with #E6E9ED borders, clean #73879C column headers,
 * and high-contrast #2A3F54 typography in strict light mode.
 */
export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const navigate = useNavigate();

  const sortedOrders = [...orders]
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="font-sans">
      <div className="overflow-x-auto border border-[#E6E9ED] rounded-[3px]">
        <table className="w-full text-left text-xs border-collapse bg-white">
          <thead>
            <tr className="border-b-2 border-[#E6E9ED] text-[#73879C] font-bold text-[10px] uppercase tracking-wider bg-[#F9F9F9]">
              <th className="py-2.5 px-3">Order ID</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Parish / Hub</th>
              <th className="py-2.5 px-3">Fulfillment</th>
              <th className="py-2.5 px-3 text-right">Total (JMD)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order, idx) => {
              const formattedDate = new Date(order.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              const isShipping = order.fulfillment_method === 'delivery' || order.fulfillment_type === 'shipping';

              return (
                <tr 
                  key={order.id} 
                  onClick={() => navigate(`/admin/orders/${order.id.replace('#', '')}`)}
                  className={`border-b border-[#E6E9ED] last:border-none hover:bg-[#F2F5F8] transition-colors cursor-pointer ${
                    idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold font-mono text-[#2A3F54] hover:text-[#1ABB9C]">
                    {order.id.startsWith('#') ? order.id : `#${order.id}`}
                  </td>
                  <td className="py-2.5 px-3 text-[#73879C] font-mono text-[11px]">
                    {formattedDate}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#2A3F54]">
                    {order.customerName}
                  </td>
                  <td className="py-2.5 px-3 text-[#73879C]">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-[#73879C]" />
                      {order.shipping_parish || order.shipping_address?.parish || 'Ocho Rios (Pickup)'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {isShipping ? (
                      <span className="inline-flex items-center gap-1 bg-[#337AB7]/10 text-[#337AB7] border border-[#337AB7]/20 px-2 py-0.5 rounded-[3px] text-[10px] font-bold">
                        <Truck size={10} />
                        Courier
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-[#1ABB9C]/10 text-[#1ABB9C] border border-[#1ABB9C]/20 px-2 py-0.5 rounded-[3px] text-[10px] font-bold">
                        <Store size={10} />
                        Storefront
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold font-mono text-[#2A3F54] tabular-nums">
                    ${(order.total || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                      <OrderStatusBadge status={order.status || 'pending'} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#73879C]">
                  No orders recorded in this interval.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-end">
        <button 
          type="button"
          onClick={() => navigate('/admin/orders')}
          className="text-xs font-bold text-[#337AB7] hover:text-[#286090] hover:underline flex items-center gap-1 cursor-pointer"
        >
          View Full Order History
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
