import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Package, 
  Truck, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';

interface OrderTrackingTimelineProps {
  order: Order;
}

interface TrackingMilestone {
  key: string;
  label: string;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<any>;
  details: {
    statusText: string;
    locationText: string;
    timeOffset: string;
  };
}

export default function OrderTrackingTimeline({ order }: OrderTrackingTimelineProps) {
  const [showLogs, setShowLogs] = useState(false);

  // Determine current lifecycle step representation
  const currentStatus = order.status?.toLowerCase() as OrderStatus;

  // Track active steps from index 0 to 3
  let activeStepIndex = 0; // 0: Placed/Pending, 1: Paid/Processing, 2: Ready/Transit, 3: Completed
  
  if (order.paymentStatus === 'paid' || currentStatus === 'payment_confirmed' || currentStatus === 'picked' || currentStatus === 'packed') {
    activeStepIndex = 1; // Processing is active
  }
  if (currentStatus === 'ready_for_pickup' || currentStatus === 'ready_for_delivery') {
    activeStepIndex = 2; // Ready/Transit is active
  }
  if (currentStatus === 'completed') {
    activeStepIndex = 3; // Completed is active
  }
  if (currentStatus === 'cancelled') {
    activeStepIndex = -1; // Special canceled state
  }

  // Set up milestones representing the ecommerce supply chain
  const milestones: TrackingMilestone[] = [
    {
      key: 'placed',
      label: 'Order Placed',
      title: 'Order Received',
      shortDesc: 'Payment secured & routing initiated',
      icon: Inbox,
      details: {
        statusText: 'Your order was logged in the central inventory dispatch database.',
        locationText: 'Central Server, Kingston, Jamaica',
        timeOffset: '08:30 AM'
      }
    },
    {
      key: 'processing',
      label: 'In Processing',
      title: 'Quality & Packing Check',
      shortDesc: 'Equipment inspected, securely boxed',
      icon: Package,
      details: {
        statusText: 'Logistics crew completed integrity check on active converters & brackets.',
        locationText: 'Ocho Rios Fulfillment Center, St. Ann',
        timeOffset: '11:15 AM'
      }
    },
    {
      key: 'shipped',
      label: 'On the Way',
      title: 'In Transit via Courier',
      shortDesc: 'Outward transit across highway routes',
      icon: Truck,
      details: {
        statusText: 'Package signed off and dispatched by regional delivery operator.',
        locationText: 'North-Coast Highway Route Carrier',
        timeOffset: '02:45 PM'
      }
    },
    {
      key: 'delivered',
      label: 'Delivered',
      title: 'Arrived at Destination',
      shortDesc: 'Package received & signed',
      icon: MapPin,
      details: {
        statusText: 'Delivery package dropped off. Handover certified by signature.',
        locationText: order.fulfillmentLocation || 'Customer Designated Parish',
        timeOffset: '04:10 PM'
      }
    }
  ];

  // Specific granular tracking logs that add absolute realism and high value to en-route status
  const trackingLogsList = [
    {
      time: '04:10 PM',
      date: order.date,
      title: 'Delivered Successfully',
      desc: `Signature acquired at destination. Marked as settled. Delivery finalized to: ${order.customerName}`,
      step: 3
    },
    {
      time: '01:30 PM',
      date: order.date,
      title: 'Out for Local Delivery Route',
      desc: 'Courier parcel scanned at local parish delivery locker & loaded into shipping van.',
      step: 2
    },
    {
      time: '09:45 AM',
      date: order.date,
      title: 'Shipped from Regional Hub',
      desc: 'In-transit manifest issued. Box packed with protective cushioning and certified safe.',
      step: 2
    },
    {
      time: '08:15 AM',
      date: order.date,
      title: 'Package Quality Inspection Approved',
      desc: 'Industrial quality scan passed. All components matching strict solar standard specs.',
      step: 1
    },
    {
      time: '07:30 AM',
      date: order.date,
      title: 'Payment Gateway Authentication Verified',
      desc: `${order.paymentStatus?.toUpperCase() || 'PAID'} authorization cleared. Invoice generated. Reference: ${order.receiptNumber || 'REC-' + order.id.replace('#', '')}`,
      step: 1
    },
    {
      time: '07:15 AM',
      date: order.date,
      title: 'Order Submitted',
      desc: 'Order requested by custom device portal. Pending inventory lock queue.',
      step: 0
    }
  ];

  // Filter logs based on what has already completed
  const currentLogs = trackingLogsList.filter(log => log.step <= activeStepIndex);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm relative overflow-hidden transition-all duration-300">
      
      {/* Visual background grid effect */}
      <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none opacity-50" />
      
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <Truck size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-primary/80 tracking-wider">Jamaica Logistics Hub</span>
            <h4 className="font-display font-extrabold text-slate-800 text-sm">Order Status Tracking Engine</h4>
          </div>
        </div>
        
        {/* Status indicator pills */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            Ref: {order.id}
          </span>
          {order.status === 'cancelled' ? (
            <span className="text-[11px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200">
              Cancelled
            </span>
          ) : activeStepIndex === 3 ? (
            <span className="text-[11px] font-black uppercase tracking-wider bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-205 flex items-center gap-1">
              <CheckCircle2 size={12} /> Complete
            </span>
          ) : (
            <span className="text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 animate-pulse">
              In Progress
            </span>
          )}
        </div>
      </div>

      {order.status === 'cancelled' ? (
        <div className="bg-red-50/70 border border-red-100 rounded-2xl p-5 flex items-start gap-3 relative z-10">
          <span className="text-xl">⚠️</span>
          <div>
            <h5 className="font-extrabold text-red-900 text-xs uppercase tracking-wider">This order was cancelled</h5>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              Fulfillment processing halted. The total refund value of <strong>JMD ${order.total?.toLocaleString()}</strong> has been credited to your selected payment method.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 relative z-10">
          
          {/* Graphical Pipeline Progress Track */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-3 relative">
            
            {/* Visual connector line back-shadow for horizontal timeline on md+ */}
            <div className="absolute top-[28px] left-[12.5%] right-[12.5%] h-1 bg-slate-100 hidden md:block rounded-full z-0" />
            
            {/* Active filled connector line progress on md+ */}
            {activeStepIndex > 0 && (
              <div 
                className="absolute top-[28px] left-[12.5%] h-1 bg-gradient-to-r from-primary to-emerald-500 hidden md:block rounded-full z-0 transition-all duration-1000" 
                style={{ 
                  width: activeStepIndex >= 3 ? '75%' : activeStepIndex === 2 ? '50%' : '25%' 
                }}
              />
            )}

            {milestones.map((milestone, idx) => {
              const isPast = idx < activeStepIndex;
              const isCurrent = idx === activeStepIndex;
              const isActive = idx <= activeStepIndex;
              const MilestoneIcon = milestone.icon;

              return (
                <div key={milestone.key} className="flex md:flex-col items-start md:items-center gap-4 text-left md:text-center relative z-10">
                  {/* Step bubble */}
                  <div 
                    className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-all duration-500 shadow-xs ${
                      isCurrent 
                        ? 'bg-primary border-primary text-white scale-110 ring-4 ring-primary/10 shadow-lg' 
                        : isPast 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'bg-white border-slate-205 text-slate-300'
                    }`}
                  >
                    <MilestoneIcon size={20} className={isCurrent ? 'animate-bounce' : ''} />
                  </div>

                  {/* Text details labels */}
                  <div className="md:mt-2">
                    <div className="flex items-center gap-1.5 md:justify-center">
                      <span className={`text-[10px] font-mono uppercase font-black px-1.5 py-0.5 rounded ${
                        isCurrent 
                          ? 'bg-primary/10 text-primary' 
                          : isPast 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-50 text-slate-400'
                      }`}>
                        Stage {idx + 1}
                      </span>
                    </div>
                    <span className={`block text-xs font-black mt-1 ${
                      isActive ? 'text-secondary' : 'text-slate-400'
                    }`}>
                      {milestone.label}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium mt-0.5 max-w-[150px] leading-snug">
                      {milestone.shortDesc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Active Step Box Callout */}
          {activeStepIndex >= 0 && activeStepIndex <= 3 && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mt-4 transition-all duration-300">
              <span className="text-[9px] uppercase font-mono font-black text-primary tracking-widest block mb-1">
                Current Active Milestone
              </span>
              <h5 className="font-extrabold text-secondary text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={14} className="text-primary" />
                {milestones[activeStepIndex].title}
              </h5>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                {milestones[activeStepIndex].details.statusText}
              </p>
              
              <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-2 gap-4 text-[10px] font-semibold text-slate-500 font-mono">
                <div>
                  <span className="text-slate-400 block pb-0.5 uppercase tracking-wider">Location:</span>
                  <span className="text-secondary font-bold text-[11px]">
                    {milestones[activeStepIndex].details.locationText}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block pb-0.5 uppercase tracking-wider">Scanned Time:</span>
                  <span className="text-secondary font-bold text-[11px]">
                    {order.date} · {milestones[activeStepIndex].details.timeOffset}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Audit Logs Collapse */}
          <div className="border-t border-slate-100 pt-4 mt-6">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex items-center justify-between text-xs font-black text-secondary/80 hover:text-primary transition-colors cursor-pointer py-1.5 px-1 hover:bg-slate-50 rounded-lg"
            >
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-primary" />
                Detailed Action History Logs ({currentLogs.length})
              </span>
              {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showLogs && (
              <div className="mt-4 space-y-4 pl-3 border-l border-slate-200 relative animate-fade-in">
                {currentLogs.map((log, index) => (
                  <div key={index} className="relative pl-4">
                    {/* Tiny dot */}
                    <div className="absolute -left-[17px] top-[4px] w-2.5 h-2.5 rounded-full bg-primary border-2 border-white ring-2 ring-primary/20" />
                    
                    <div className="text-[11px] text-slate-400 font-mono font-semibold">
                      {log.date} · {log.time}
                    </div>
                    <div className="text-xs font-extrabold text-secondary mt-0.5">
                      {log.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">
                      {log.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt/Banner */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-secondary/5 rounded-xl p-3 border border-secondary/15">
            <HelpCircle size={14} className="text-secondary shrink-0" />
            <span>Need hardware assembly manuals or dispatch route updates? Contact our Ocho Rios hub directly.</span>
          </div>

        </div>
      )}

    </div>
  );
}
