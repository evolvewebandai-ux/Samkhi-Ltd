import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useDiscounts } from '../context/DiscountContext';
import { useInventory } from '../context/InventoryContext';
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Landmark, 
  Truck, 
  CheckCircle2, 
  ArrowRight, 
  Tag, 
  X, 
  Sparkles,
  Building,
  MapPin,
  Clock,
  Phone,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Order, DiscountCoupon, ShippingRate, PickupLocation } from '../types';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { validateDiscount } = useDiscounts();
  const { customerProfile, triggerEmailNotification } = useCustomerAuth();
  const { inventoryLevels, bulkAdjustLevels } = useInventory();

  const [isSuccess, setIsSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [placedOrderTotal, setPlacedOrderTotal] = useState(0);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSimulatedWebhookLoading, setIsSimulatedWebhookLoading] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState('');
  
  // Real database rates & collections
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [pickups, setPickups] = useState<PickupLocation[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Delivery configuration states
  const [fulfillmentType, setFulfillmentType] = useState<'shipping' | 'pickup'>('shipping');
  const [selectedPickupId, setSelectedPickupId] = useState<string>('');

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    fullName: '',
    address: '',
    city: '',
    parish: 'Kingston & St. Andrew'
  });

  // Query and subscribe real-time logistics from Firestore
  useEffect(() => {
    // 1. Shipping Rates
    const ratesQuery = query(collection(db, 'shipping_rates'), orderBy('sort_order', 'asc'));
    const unsubRates = onSnapshot(ratesQuery, (snap) => {
      const parsed: ShippingRate[] = [];
      snap.forEach(d => {
        const item = { id: d.id, ...d.data() } as ShippingRate;
        if (item.is_active) parsed.push(item);
      });
      setRates(parsed);
      
      // Select first active parish as default if rates exist
      if (parsed.length > 0) {
        setFormData(prev => {
          const hasExactMatch = parsed.some(r => r.name.toLowerCase().trim() === prev.parish.toLowerCase().trim());
          return {
            ...prev,
            parish: hasExactMatch ? prev.parish : parsed[0].name
          };
        });
      }
    }, (err) => console.warn("Failed fetching active rates:", err));

    // 2. Pickup stores
    const pickupsQuery = collection(db, 'pickup_locations');
    const unsubPickups = onSnapshot(pickupsQuery, (snap) => {
      const parsed: PickupLocation[] = [];
      snap.forEach(d => {
        const item = { id: d.id, ...d.data() } as PickupLocation;
        if (item.is_active) parsed.push(item);
      });
      setPickups(parsed);
      
      // Auto-preselect default pickup location
      const def = parsed.find(p => p.is_default) || parsed[0];
      if (def) {
        setSelectedPickupId(def.id);
      }
      setDbLoading(false);
    }, (err) => {
      console.warn("Failed fetching pickups storefronts:", err);
      setDbLoading(false);
    });

    return () => {
      unsubRates();
      unsubPickups();
    };
  }, []);

  // Prefill profile values on login
  useEffect(() => {
    if (customerProfile) {
      const defaultAddr = customerProfile.addresses?.find(a => a.isDefault) || customerProfile.addresses?.[0];
      setFormData({
        fullName: customerProfile.name || '',
        email: customerProfile.email || '',
        phone: customerProfile.phone || '',
        address: defaultAddr?.street || '',
        city: defaultAddr?.id ? 'Local Jamaica Parish' : '',
        parish: defaultAddr?.parish || 'Kingston & St. Andrew'
      });
    }
  }, [customerProfile]);

  const handleSavedAddressSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const addrId = e.target.value;
    if (!addrId) return;
    const selected = customerProfile?.addresses?.find(a => a.id === addrId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        address: selected.street,
        parish: selected.parish,
        phone: selected.phone
      }));
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  
  // Discount state
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCoupon | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountError(null);
    setIsValidatingCode(true);
    try {
      const discount = await validateDiscount(discountCode, formData.email);
      if (discount) {
        // Check minimum purchase
        if (discount.minPurchase && totalPrice < discount.minPurchase) {
          setDiscountError(`Minimum purchase amount of $${discount.minPurchase.toLocaleString()} JMD required to apply code "${discount.code}".`);
          return;
        }

        // Check target scope eligibility
        if (discount.appliesTo === 'category' && discount.targetCategory) {
          const matchingItems = cart.filter(item => 
            (item as any).category?.toLowerCase().trim() === discount.targetCategory?.toLowerCase().trim()
          );
          if (matchingItems.length === 0) {
            setDiscountError(`Code "${discount.code}" only applies to category "${discount.targetCategory}". No matching items in your cart.`);
            return;
          }
        } else if (discount.appliesTo === 'specific_products' && discount.targetProductIds && discount.targetProductIds.length > 0) {
          const targetIds = discount.targetProductIds;
          const matchingItems = cart.filter(item => 
            targetIds.includes(item.id) || targetIds.includes((item as any).originalProductId)
          );
          if (matchingItems.length === 0) {
            setDiscountError(`Code "${discount.code}" only applies to specific selected products. None are currently in your cart.`);
            return;
          }
        }

        setAppliedDiscount(discount);
        setDiscountCode('');
      } else {
        setDiscountError('Invalid or expired discount code');
      }
    } catch (e: any) {
      setDiscountError(e?.message || 'Error validating coupon code');
    } finally {
      setIsValidatingCode(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
  };

  const calculateDiscountAmount = () => {
    if (!appliedDiscount) return 0;

    // Calculate eligible subtotal based on target scope
    let eligibleSubtotal = totalPrice;
    if (appliedDiscount.appliesTo === 'category' && appliedDiscount.targetCategory) {
      eligibleSubtotal = cart
        .filter(item => (item as any).category?.toLowerCase().trim() === appliedDiscount.targetCategory?.toLowerCase().trim())
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    } else if (appliedDiscount.appliesTo === 'specific_products' && appliedDiscount.targetProductIds) {
      const targetIds = appliedDiscount.targetProductIds;
      eligibleSubtotal = cart
        .filter(item => targetIds.includes(item.id) || targetIds.includes((item as any).originalProductId))
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    if (appliedDiscount.type === 'Percentage') {
      return eligibleSubtotal * (parseFloat(appliedDiscount.value) / 100);
    }
    if (appliedDiscount.type === 'Fixed Amount') {
      return Math.min(eligibleSubtotal, parseFloat(appliedDiscount.value));
    }
    return 0;
  };

  const discountAmount = calculateDiscountAmount();
  const discountedSubtotal = Math.max(0, totalPrice - discountAmount);
  
  // GCT TAX
  const gct = discountedSubtotal * 0.15;

  // Real-time delivery rate calculations
  const calculateDeliveryCharge = () => {
    if (fulfillmentType === 'pickup') return 0;
    if (appliedDiscount?.type === 'Free Shipping') return 0;

    const matchingRate = rates.find(
      r => r.name.toLowerCase().trim() === formData.parish.toLowerCase().trim()
    );

    if (!matchingRate) return 1500; // Average Jamaican Flat backup factor

    // Auto free threshold evaluate
    if (matchingRate.free_shipping_threshold && discountedSubtotal >= matchingRate.free_shipping_threshold) {
      return 0;
    }

    return matchingRate.rate;
  };

  const delivery = calculateDeliveryCharge();
  const total = discountedSubtotal + gct + delivery;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPlacing(true);
    setPlaceError(null);

    // Enforce pickup pre-requisites
    if (fulfillmentType === 'pickup' && !selectedPickupId) {
      setPlaceError("Please choose an active storefront for self-collection.");
      setIsPlacing(false);
      return;
    }

    const currentPickupObj = pickups.find(p => p.id === selectedPickupId);
    const checkoutPayload = {
      customerName: formData.fullName,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      shippingAddress: fulfillmentType === 'pickup' 
        ? `STORE COLL / PICKUP: ${currentPickupObj?.name || 'Main Warehouse'} - Address: ${currentPickupObj?.address || ''}`
        : formData.address,
      parish: fulfillmentType === 'pickup' ? 'Kingston' : formData.parish,
      fulfillment_type: fulfillmentType,
      shipping_cost: delivery,
      shipping_parish: fulfillmentType === 'pickup' ? null : formData.parish,
      pickup_location_id: fulfillmentType === 'pickup' ? selectedPickupId : null,
      cartItems: cart.map(item => ({
        id: item.id,
        originalProductId: (item as any).originalProductId || item.id,
        variantId: (item as any).variantId || undefined,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl
      })),
      discountCode: appliedDiscount?.code || '',
      discountAmount: discountAmount,
      subtotal: discountedSubtotal,
      taxes: gct,
      total: total
    };

    try {
      const response = await fetch('/api/payments/fygaro/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error initiating secure checkout session');
      }

      const result = await response.json();
      if (result.success) {
        setPlacedOrderId(result.orderId);
        setCheckoutUrl(result.checkoutUrl);
        setPaymentReference(result.paymentReference);
        setPlacedOrderTotal(total);
        setIsSuccess(true);
        setTimeout(() => clearCart(), 100);
      } else {
        throw new Error('Failed to create order checkout session');
      }
    } catch (err: any) {
      console.error("Secure Checkout error:", err);
      setPlaceError(err.message || 'An error occurred during order initialization.');
    } finally {
      setIsPlacing(false);
    }
  };

  const triggerSimulatedWebhook = async () => {
    setIsSimulatedWebhookLoading(true);
    setWebhookMessage('');
    try {
      const response = await fetch('/api/payments/fygaro/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: placedOrderId,
          reference: paymentReference,
          amount: placedOrderTotal,
          status: 'success'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Webhook verification failed');
      }

      const result = await response.json();
      setWebhookMessage('✨ Simulated Fygaro Payment Webhook delivered and processed successfully by backend server! Stock numbers decreased and order status updated to PAID!');
    } catch (err: any) {
      console.error("Simulated webhook failed:", err);
      setWebhookMessage(`❌ Verification failed: ${err.message}`);
    } finally {
      setIsSimulatedWebhookLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 py-16">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-xl w-full bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard size={40} />
          </div>
          
          <h1 className="text-3xl font-display font-black text-secondary mb-2">Order Created Successfully!</h1>
          <p className="text-sm font-semibold text-slate-500 mb-6">
            Order Reference: <span className="font-mono font-bold text-slate-800">{placedOrderId}</span>
          </p>

          {/* Secure Redirection Alert Card */}
          <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-3xl mb-8 text-left space-y-4">
            <h3 className="text-sm font-black uppercase text-secondary font-mono tracking-wider flex items-center gap-2">
              <ShieldCheck className="text-primary" size={18} />
              Fygaro Hosted Checkout
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Your order draft has been compiled securely by our server. To complete your secure payment, use the link below to load your custom Fygaro checkout form:
            </p>
            <div className="pt-2">
              <a 
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full btn-primary bg-primary text-white font-bold text-center flex items-center justify-center gap-3 py-4 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                Launch Secure Fygaro Gateway
                <ArrowRight size={18} />
              </a>
              <span className="block text-[10px] text-slate-400 font-semibold text-center mt-2">
                Merchant Contact ID: payments@samkhi.com • Secure token validation active in the browser
              </span>
            </div>
          </div>

          {/* Developer webhook block */}
          <div className="border border-indigo-100 bg-indigo-50/50 p-6 rounded-3xl mb-8 text-left space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-ping" />
              <h4 className="text-xs font-black uppercase tracking-widest text-indigo-900 font-mono">
                Developer Webhook Sandbox Simulator
              </h4>
            </div>
            <p className="text-[11px] text-indigo-750 font-medium leading-relaxed">
              In this development environment, you can test the end-to-end full-stack checkout lifecycle by triggering a simulated payment-success webhook back to our server. This will update the order to <strong className="text-indigo-950">PAID</strong>, decrement inventory counts, and record audit activity logs safely in Firestore!
            </p>
            <button 
              type="button"
              onClick={triggerSimulatedWebhook}
              disabled={isSimulatedWebhookLoading}
              className="w-full text-xs font-bold bg-indigo-950 text-indigo-50 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSimulatedWebhookLoading ? "Processing server-side updates..." : "Deploy Simulated Webhook Success"}
            </button>
            {webhookMessage && (
              <p className="p-3 text-[11px] font-semibold font-sans bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-lg whitespace-pre-wrap leading-relaxed animate-fade-in">
                {webhookMessage}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Link to="/" className="w-full py-3.5 text-sm font-bold text-[#616161] hover:text-secondary hover:bg-slate-100 transition-all text-center">
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen py-16 text-left">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
           <Lock size={24} className="text-[#3b82f6]" />
           <h1 className="text-4xl font-display font-black text-secondary">Secure Checkout</h1>
        </div>

        {!customerProfile && (
          <div className="mb-8 p-5 bg-gradient-to-r from-secondary to-slate-900 border border-slate-800 text-white rounded-[2rem] flex flex-wrap justify-between items-center gap-4 shadow-sm font-sans">
            <div>
              <h4 className="font-display font-bold text-sm text-cta flex items-center gap-1.5"><Sparkles size={16} /> Save time during checkout!</h4>
              <p className="text-[11px] text-slate-300 mt-1 font-semibold">Log in to your Samkhi Limited Account to use saved addresses, track live parcel shipping, and view past orders.</p>
            </div>
            <Link to="/account" className="btn-cta text-[10px] uppercase font-bold py-2.5 px-4 shadow-md bg-cta text-secondary">
              Log In / Register
            </Link>
          </div>
        )}

        {dbLoading ? (
          <div className="flex flex-col items-center justify-center py-16 min-h-[400px]">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
            <p className="text-sm text-slate-500 font-mono font-bold uppercase tracking-wider">Compiling live delivery fees...</p>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Form Side */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* SECTION 1: CONTACT INFO */}
              <section className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h2 className="text-2xl font-display font-black text-secondary mb-8 flex items-center gap-4">
                  <span className="w-10 h-10 bg-secondary text-white rounded-2xl flex items-center justify-center text-sm font-bold">1</span>
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      required 
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-semibold placeholder:text-slate-400" 
                      placeholder="customer@email.com" 
                    />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Phone Number</label>
                    <input 
                      type="tel" 
                      name="phone"
                      required 
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-semibold placeholder:text-slate-400 font-mono" 
                      placeholder="(876) 000-0000" 
                    />
                  </div>
                </div>
              </section>

              {/* SECTION 2: DELIVERY METHOD & LOCATION DETAILS */}
              <section className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                
                {/* Fulfillment Selection Tabs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
                  <h2 className="text-2xl font-display font-black text-secondary flex items-center gap-4">
                    <span className="w-10 h-10 bg-secondary text-white rounded-2xl flex items-center justify-center text-sm font-bold">2</span>
                    Fulfillment Method
                  </h2>
                  
                  <div className="flex bg-[#ededed] p-1 rounded-2xl select-none shrink-0">
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('shipping')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                        fulfillmentType === 'shipping' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Truck size={14} />
                      Courier Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('pickup')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                        fulfillmentType === 'pickup' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      <Building size={14} />
                      Store Pickup
                    </button>
                  </div>
                </div>

                {/* Sub-form renders based on choice */}
                <AnimatePresence mode="wait">
                  {fulfillmentType === 'shipping' ? (
                    <motion.div 
                      key="shipping-layout"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-6"
                    >
                      {customerProfile && customerProfile.addresses && customerProfile.addresses.length > 0 && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col space-y-1.5 font-sans">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Choose Saved Address Destination</label>
                          <select 
                            onChange={handleSavedAddressSelect}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none text-xs font-bold text-slate-800 transition-all cursor-pointer"
                          >
                            <option value="">-- Enter Custom Address --</option>
                            {customerProfile.addresses.map(a => (
                              <option key={a.id} value={a.id}>{a.name ? `${a.name} · ` : ''}{a.street}, {a.parish}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Full Name</label>
                        <input 
                          type="text" 
                          name="fullName"
                          required={fulfillmentType === 'shipping'} 
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-semibold placeholder:text-slate-400" 
                          placeholder="John Doe" 
                        />
                      </div>

                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Street Address</label>
                        <input 
                          type="text" 
                          name="address"
                          required={fulfillmentType === 'shipping'} 
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-semibold placeholder:text-slate-400" 
                          placeholder="123 Constant Spring Road" 
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                        <div className="flex flex-col space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">City / Town</label>
                          <input 
                            type="text" 
                            name="city"
                            required={fulfillmentType === 'shipping'} 
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-semibold placeholder:text-slate-400" 
                            placeholder="Kingston 10" 
                          />
                        </div>
                        
                        <div className="flex flex-col space-y-2 font-sans">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Delivery Parish</label>
                          <div className="relative">
                            <select 
                              name="parish"
                              value={formData.parish}
                              onChange={handleInputChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-[#3b82f6] focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                            >
                              {rates.map(r => (
                                <option key={r.id} value={r.name}>
                                  {r.name} ({r.rate === 0 ? "FREE" : `J$${r.rate.toLocaleString()}`})
                                </option>
                              ))}
                              {rates.length === 0 && (
                                <>
                                  <option value="Kingston & St. Andrew">Kingston & St. Andrew</option>
                                  <option value="St. Catherine">St. Catherine</option>
                                  <option value="St. James">St. James</option>
                                  <option value="St. Ann">St. Ann</option>
                                </>
                              )}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Display delivery estimate note */}
                      <div className="p-4.5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-2.5">
                        <AlertCircle className="text-blue-500 mt-0.5 shrink-0" size={16} />
                        <div>
                          <div className="font-extrabold text-blue-900 text-[11px] uppercase tracking-wider font-mono">Fulfillment Estimate</div>
                          <p className="text-xs text-slate-700 font-semibold mt-0.5">
                            Standard shipping to <strong className="text-slate-900">{formData.parish}</strong> takes approximately <strong className="text-slate-900">{rates.find(r => r.name === formData.parish)?.estimated_days || '2-3 business days'}</strong>.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="pickup-layout"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Collector Full Name</label>
                        <input 
                          type="text" 
                          name="fullName"
                          required={fulfillmentType === 'pickup'} 
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-semibold placeholder:text-slate-400" 
                          placeholder="Your full name" 
                        />
                      </div>

                      {/* Store Select list */}
                      <div className="flex flex-col space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Choose Pickup Point Outlet</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pickups.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => setSelectedPickupId(p.id)}
                              className={cn(
                                "p-4.5 rounded-2xl border flex flex-col text-left transition-all gap-2 cursor-pointer relative",
                                selectedPickupId === p.id 
                                  ? "border-indigo-650 border-2 bg-indigo-50/20 ring-2 ring-indigo-50" 
                                  : "border-slate-200 hover:border-slate-350"
                              )}
                            >
                              {p.is_default && (
                                <span className="absolute top-3.5 right-3.5 bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded text-[8px] font-mono font-black uppercase">
                                  Default
                                </span>
                              )}
                              
                              <div className="font-extrabold text-xs text-slate-900 tracking-tight flex items-center gap-1">
                                <Building size={14} className="text-indigo-600" />
                                {p.name}
                              </div>
                              <p className="text-slate-500 font-semibold leading-normal text-[11px] flex gap-1 items-start">
                                <MapPin size={11} className="mt-0.5 shrink-0 text-slate-400" />
                                <span>{p.address}, {p.parish}</span>
                              </p>
                              
                              <div className="border-t pt-2 mt-1 space-y-1 font-semibold text-[10px] text-slate-500">
                                <p className="flex items-center gap-1"><Clock size={10} /> {p.hours}</p>
                                <p className="flex items-center gap-1"><Phone size={10} /> {p.phone}</p>
                              </div>
                            </button>
                          ))}
                          
                          {pickups.length === 0 && (
                            <div className="col-span-full italic border border-dashed rounded-2xl p-6 text-slate-450 text-center">
                              No pickup outlets currently listed.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pickup Info Alert */}
                      <div className="p-4.5 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex items-start gap-2.5">
                        <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={16} />
                        <div>
                          <div className="font-extrabold text-emerald-800 text-[11px] uppercase tracking-wider font-mono">Collect Storefront Order (FREE)</div>
                          <p className="text-xs text-slate-700 font-semibold mt-0.5">
                            Order is free from postage charges. Pay exact balances on collection or wire NCB/Scotiabank bank slips directly to secure instant stock isolation.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* SECTION 3: PAYMENT METHOD */}
              <section className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h2 className="text-2xl font-display font-black text-secondary mb-8 flex items-center gap-4">
                  <span className="w-10 h-10 bg-secondary text-white rounded-2xl flex items-center justify-center text-sm font-bold">3</span>
                  Payment Method
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button 
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left cursor-pointer",
                      paymentMethod === 'card' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                    )}
                   >
                      <div className={cn("p-3 rounded-xl", paymentMethod === 'card' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-secondary text-sm">Credit / Debit Card</p>
                        <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">Visa, Mastercard, KeyCard</p>
                      </div>
                   </button>
                   <button 
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left cursor-pointer",
                      paymentMethod === 'transfer' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                    )}
                   >
                      <div className={cn("p-3 rounded-xl", paymentMethod === 'transfer' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                        <Landmark size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-secondary text-sm">Bank Transfer</p>
                        <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">NCB, Scotiabank, Sagicor</p>
                      </div>
                   </button>
                </div>
              </section>
            </div>

            {/* Right Side: Receipt LEDGER */}
            <div className="lg:col-span-5">
               <div className="bg-secondary rounded-[2.5rem] p-10 text-white sticky top-24 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
                  
                  <h3 className="text-2xl font-display font-black mb-8 flex items-center justify-between">
                    Order Summary
                    <span className="text-[10px] font-black uppercase text-cta tracking-widest px-3 py-1 bg-white/10 rounded-full">Secure</span>
                  </h3>

                  <div className="space-y-4 mb-8 font-semibold">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span className="font-mono">J${totalPrice.toLocaleString()}</span>
                    </div>
                    
                    {appliedDiscount && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex justify-between text-cta"
                      >
                        <div className="flex items-center gap-1">
                          <Tag size={14} />
                          <span>Discount ({appliedDiscount.code})</span>
                          <button onClick={removeDiscount} className="ml-1 p-0.5 hover:bg-white/10 rounded cursor-pointer">
                            <X size={10} />
                          </button>
                        </div>
                        <span className="font-mono">-J${discountAmount.toLocaleString()}</span>
                      </motion.div>
                    )}

                    <div className="flex justify-between text-slate-400">
                      <span>GCT (15%)</span>
                      <span className="font-mono">J${gct.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Fulfillment ({fulfillmentType === 'pickup' ? 'Store Pickup' : 'Courier Delivery'})</span>
                      <span className={cn("font-mono font-bold", delivery === 0 ? "text-cta" : "")}>
                        {delivery === 0 ? 'FREE' : `J$${delivery.toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {/* Discount input field */}
                  <div className="mb-8 p-1 bg-white/5 rounded-2xl border border-white/10 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Discount Code"
                      value={discountCode}
                      onChange={e => setDiscountCode(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none px-4 py-3 font-bold text-white placeholder:text-slate-500 uppercase tracking-widest text-sm"
                    />
                    <button 
                      type="button" 
                      disabled={isValidatingCode}
                      onClick={handleApplyDiscount}
                      className="bg-white text-secondary px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-cta hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isValidatingCode ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {discountError && (
                    <p className="text-cta text-[10px] font-bold uppercase tracking-widest mb-6 -mt-6 ml-2">{discountError}</p>
                  )}

                  <div className="border-t border-white/10 pt-6 mb-10">
                     <div className="flex justify-between items-end">
                       <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Charged</span>
                       <span className="text-3xl font-display font-black text-white font-mono">J${total.toLocaleString()}</span>
                     </div>
                  </div>

                  {placeError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/25 text-cta text-xs font-bold rounded-2xl mb-6 text-center leading-normal">
                      ❌ ERROR: {placeError}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isPlacing}
                    className="btn-cta w-full py-5 text-xl font-display font-black mb-8 group disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-xl select-none"
                  >
                     {isPlacing ? 'Placing Order...' : 'Complete Checkout'}
                     {!isPlacing && <ArrowRight className="group-hover:translate-x-1 transition-transform animate-pulse" />}
                  </button>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <ShieldCheck size={18} className="text-primary-accent" />
                      256-BIT ENCRYPTION LIVE
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <Truck size={18} className="text-primary-accent" />
                      {fulfillmentType === 'pickup' ? 'READY IN 1-2 BUSINESS HOURS' : `DELIVERS TO ${formData.parish.toUpperCase()} SWIFTLY`}
                    </div>
                  </div>
               </div>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
