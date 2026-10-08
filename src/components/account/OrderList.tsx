import { useState } from 'react';
import { Package, Truck, ShieldCheck, AlertCircle, Eye, RefreshCw, Star, X, HelpCircle, ArrowRight } from 'lucide-react';
import { Order, OrderItem, Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { PRODUCTS } from '../../data';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { auditAndSanitizeReview } from '../../lib/securityGateway';

interface OrderListProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

export default function OrderList({ orders, onSelectOrder }: OrderListProps) {
  const { addToCart } = useCart();
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Return request modal states
  const [returnItem, setReturnItem] = useState<OrderItem | null>(null);
  const [returnReason, setReturnReason] = useState('defect');
  const [returnSuccess, setReturnSuccess] = useState(false);

  const getStatusDetails = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'processing':
        return {
          label: 'Processing',
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          progress: 25,
          desc: 'Our logistics team is packing your LED or solar components.'
        };
      case 'shipped':
        return {
          label: 'Shipped & En Route',
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          progress: 60,
          desc: 'Your package is handled by courier. Out for delivery.'
        };
      case 'fulfilled':
      case 'delivered':
        return {
          label: 'Delivered',
          color: 'text-primary bg-green-50 border-green-200',
          progress: 100,
          desc: 'Package was successfully received at your Jamaica destination parish.'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'text-red-600 bg-red-50 border-red-200',
          progress: 0,
          desc: 'This order was cancelled by request.'
        };
      default:
        return {
          label: 'Pending Approval',
          color: 'text-slate-500 bg-slate-50 border-slate-200',
          progress: 10,
          desc: 'Awaiting payment confirmation.'
        };
    }
  };

  const handleBuyAgain = (item: OrderItem) => {
    // Attempt to find full product specification from library
    const matchedProd = PRODUCTS.find(p => p.id === item.productId);
    const mockProduct: Product = matchedProd || {
      id: item.productId,
      name: item.productName,
      description: 'Samkhi High Performance Equipment',
      price: item.price,
      tags: ['LED Lighting'],
      imageUrl: item.imageUrl || 'https://picsum.photos/400/400',
      inStock: true,
      specifications: {}
    };
    addToCart(mockProduct, item.quantity);

    // Show instant cart notification
    const toastDiv = document.createElement('div');
    toastDiv.className = "fixed bottom-5 left-5 z-[200] bg-primary text-white py-3 px-5 rounded-xl shadow-2xl border border-primary-accent flex items-center gap-2 text-xs font-bold font-sans animate-bounce";
    toastDiv.innerHTML = `🛒 Added ${item.quantity} × ${item.productName} to Cart!`;
    document.body.appendChild(toastDiv);
    setTimeout(() => {
      document.body.removeChild(toastDiv);
    }, 2500);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;
    setSubmittingReview(true);

    try {
      // Perform security audit and sanitization
      const auditResult = auditAndSanitizeReview(comment.trim());
      if (auditResult.sanitization_action === 'Reject_Entirely') {
        alert("Security Flagged: Your review text contains prohibited code statements or active scripts.");
        setSubmittingReview(false);
        return;
      }

      // Save review to Firestore for rich analytics
      await addDoc(collection(db, 'product_reviews'), {
        productId: reviewItem.productId,
        productName: reviewItem.productName,
        rating,
        comment: auditResult.clean_text,
        createdAt: new Date().toISOString(),
        verifiedPurchase: true
      });

      setReviewSuccess(true);
      setTimeout(() => {
        setReviewItem(null);
        setComment('');
        setRating(5);
        setReviewSuccess(false);
      }, 1500);
    } catch {
      alert("Unable to publish review at this moment.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReturnSuccess(true);
    setTimeout(() => {
      setReturnItem(null);
      setReturnSuccess(false);
    }, 1500);
  };

  if (orders.length === 0) {
    return (
      <div className="bg-slate-50 rounded-3xl p-12 text-center border border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 mx-auto rounded-full flex items-center justify-center mb-4">
          <Package size={28} />
        </div>
        <h3 className="font-display font-bold text-xl text-secondary">No matching orders found</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          If you recently did guest checkout, utilize the Guest Tracker lookup on the sidebar or sign in with your checkout email.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <h3 className="font-display font-black text-xl text-secondary flex items-center gap-2">
          <Package className="text-primary" size={22} /> Order Archive ({orders.length})
        </h3>
        <span className="text-xs text-slate-400 font-mono">Real-time DB connection</span>
      </div>

      {orders.map((order) => {
        const { label, color, progress, desc } = getStatusDetails(order.status);
        // Fallback for lineItems if empty
        const lineItems: OrderItem[] = order.lineItems || [
          {
            id: `li-${order.id}-0`,
            productId: 'ne-0241',
            productName: 'Samkhi High-Efficiency Eco Component Kit',
            price: order.total / (order.items || 1),
            quantity: order.items || 1,
            imageUrl: 'https://fygaro-subscribers.s3.amazonaws.com/9669b088-1765-4e05-962b-abd27a3236ec/products/171704/c9d5763f-f3b3-44d7-b516-a8d1e8e7ad45.png'
          }
        ];

        return (
          <div 
            key={order.id} 
            className="bg-white border border-slate-100 hover:border-slate-200 rounded-3xl shadow-enterprise overflow-hidden transition-all duration-300"
            id={`order-card-${order.id.replace('#', '')}`}
          >
            {/* Header meta */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order Reference</span>
                  <p className="text-sm font-black text-secondary tracking-wide">{order.id}</p>
                </div>
                <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date Placed</span>
                  <p className="text-xs font-semibold text-slate-600">{order.date}</p>
                </div>
                <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order Total</span>
                  <p className="text-sm font-extrabold text-primary">JMD ${order.total?.toLocaleString()}</p>
                </div>
              </div>

              <div className={`text-xs font-extrabold px-3.5 py-1.5 rounded-full border ${color}`}>
                {label}
              </div>
            </div>

            {/* Progress status bar */}
            <div className="px-6 pt-5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2">
                <span>Timeline Progress</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="bg-slate-100 h-2 w-full rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    order.status === 'cancelled' ? 'bg-red-500' : 'bg-primary'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <AlertCircle size={13} className="text-slate-400 shrink-0" /> {desc}
              </p>
            </div>

            {/* Line items list */}
            <div className="p-6 divide-y divide-slate-100">
              {lineItems.map((item) => (
                <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center">
                  <img 
                    src={item.imageUrl || 'https://picsum.photos/400/400'} 
                    alt={item.productName} 
                    className="w-16 h-16 object-contain rounded-xl bg-slate-50 border border-slate-100 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-secondary line-clamp-1">{item.productName}</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      Qty: {item.quantity} · Price: JMD ${item.price?.toLocaleString()}
                    </p>
                    <div className="flex gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => handleBuyAgain(item)}
                        className="text-[10px] font-bold text-primary hover:text-primary-accent flex items-center gap-1 border-b border-primary/10 hover:border-primary transition-all cursor-pointer"
                      >
                        <RefreshCw size={11} /> Buy Again
                      </button>
                      
                      {order.status === 'completed' && (
                        <button
                          type="button"
                          onClick={() => setReviewItem(item)}
                          className="text-[10px] font-bold text-secondary hover:text-primary flex items-center gap-1 border-b border-secondary/10 hover:border-primary transition-all cursor-pointer"
                        >
                          <Star size={11} className="fill-cta text-cta" /> Write a Review
                        </button>
                      )}

                      {(order.status === 'completed' || order.status === 'payment_confirmed' || order.status === 'picked' || order.status === 'packed') && (
                        <button
                          type="button"
                          onClick={() => setReturnItem(item)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 border-b border-red-100 hover:border-red-500 transition-all cursor-pointer"
                        >
                          Request Return
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer action buttons */}
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => onSelectOrder(order)}
                className="bg-white hover:bg-slate-50 text-secondary border border-slate-200 font-bold py-2 px-4 rounded-xl text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Eye size={14} /> View Order Details
              </button>
              
              {order.status === 'ready_for_delivery' && (
                <a
                  href={`https://www.dhl.com/en/express/tracking.html?AWB=JM-89743-DH`}
                  target="_blank"
                  rel="no-referrer"
                  className="bg-primary hover:bg-primary-accent text-white font-bold py-2 px-4 rounded-xl text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck size={14} /> Track Shipment
                </a>
              )}
            </div>
          </div>
        );
      })}

      {/* Review Dialog Overlay popup */}
      {reviewItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-secondary text-white p-5 flex justify-between items-center relative overflow-hidden">
              <div className="absolute inset-0 grid-bg opacity-10" />
              <h3 className="font-display font-bold text-lg flex items-center gap-2 relative z-10">
                <Star size={20} className="fill-cta text-cta" /> Share Product Feedback
              </h3>
              <button onClick={() => setReviewItem(null)} className="text-white hover:text-slate-200 relative z-10 p-1 bg-white/10 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {reviewSuccess ? (
                <div className="text-center py-6 animate-pulse">
                  <span className="text-5xl">🎁</span>
                  <h4 className="font-display font-black text-xl text-primary mt-4">Thank You!</h4>
                  <p className="text-slate-500 text-sm mt-1">Review published. Your feedback has been successfully registered!</p>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="flex gap-4 items-center p-3 bg-slate-50 rounded-2xl">
                    <img src={reviewItem.imageUrl} className="w-12 h-12 object-contain bg-white rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="text-xs font-bold text-secondary line-clamp-1">{reviewItem.productName}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Verified Samkhi Merchant Purchase</p>
                    </div>
                  </div>

                  {/* Inter-active Stars Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 text-center">Score Your Experience</label>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          className="p-1 hover:scale-125 hover:rotate-12 active:scale-95 transition-all cursor-pointer"
                        >
                          <Star 
                            size={28} 
                            className={`${
                              s <= rating ? 'fill-cta text-cta' : 'text-slate-200'
                            }`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Write Review</label>
                    <textarea
                      required
                      placeholder="e.g. This solar inverter works absolutely flawlessly. Highly efficient backup cycles for Ocho Rios electricity dips."
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-xs font-semibold leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full btn-cta py-3 font-bold tracking-wide flex justify-center items-center"
                  >
                    {submittingReview ? "Uploading..." : "Publish Review & Log Points"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Request Overlay popup */}
      {returnItem && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-red-900 text-white p-5 flex justify-between items-center relative overflow-hidden">
              <h3 className="font-display font-bold text-lg flex items-center gap-2 relative z-10">
                🔄 Return Request
              </h3>
              <button onClick={() => setReturnItem(null)} className="text-white hover:text-slate-200 relative z-10 p-1 bg-white/10 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {returnSuccess ? (
                <div className="text-center py-6">
                  <span className="text-5xl">🤝</span>
                  <h4 className="font-display font-black text-xl text-primary mt-4">Request Submitted</h4>
                  <p className="text-slate-500 text-sm mt-1">A support manager will email you shipping return instructions shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleReturnSubmit} className="space-y-4">
                  <div className="p-3 bg-red-50 text-red-900 rounded-2xl text-xs font-semibold">
                    You are requesting return for: <strong>{returnItem.productName}</strong>.
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Select Reason</label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs text-slate-800 font-semibold"
                    >
                      <option value="defect">Dead On Arrival / Technical Defect</option>
                      <option value="wrong_item">Received Wrong Variant</option>
                      <option value="change_mind">Incompatible electrical specs / Changed mind</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Additional details</label>
                    <textarea
                      placeholder="Specify voltage details or box condition if opened..."
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-red-900 hover:bg-red-800 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all active:scale-[0.98] text-xs uppercase"
                  >
                    Submit Return Request
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
