import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Settings, 
  CreditCard, 
  Bell, 
  Shield, 
  Store, 
  Globe, 
  User, 
  ArrowLeft, 
  Check, 
  Loader2, 
  AlertCircle, 
  Sliders, 
  Lock, 
  Truck, 
  Mail, 
  MessageSquare,
  Building,
  Coins,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import AdminTeam from './Team';

type SettingTab = 'overview' | 'general' | 'payments' | 'notifications' | 'security' | 'markets' | 'team';

export default function AdminSettings() {
  const [activeTab, setActiveTab ] = useState<SettingTab>('overview');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setActivityLogs(list);
    }, (err) => {
      console.warn("Failed to listen logs", err);
    });
    return () => unsub();
  }, []);

  // General Store State
  const [storeInfo, setStoreInfo] = useState({
    name: 'Samkhi Limited',
    salesEmail: 'sales@samkhi.com',
    supportPhone: '+1 (876) 555-0199',
    currency: 'JMD (J$)',
    address: '12 Constant Spring Road, Kingston 10, Jamaica',
    timezone: 'GMT-5 (EST - Jamaica time)'
  });

  // Payments State
  const [payments, setPayments] = useState({
    bankTransferEnabled: true,
    bankName: 'National Commercial Bank (NCB)',
    accountNumber: '402118274',
    accountType: 'Savings',
    accountName: 'Samkhi Limited Ltd',
    wipayEnabled: true,
    wipayApiKey: 'sk_live_samkhi_wipay82910aef',
    wipayAccountEmail: 'payments@samkhi.com',
    codEnabled: false
  });

  // Notifications State
  const [notifications, setNotifications] = useState({
    emailOnNewOrder: true,
    emailOnLowStock: true,
    smsOnShipment: false,
    weeklyReport: true,
    lowStockThreshold: 5
  });

  // Security State
  const [security, setSecurity] = useState({
    mfaEnabled: false,
    sessionTimeout: '60',
    ipWhitelist: '',
    requireStrongPasswords: true
  });

  // Markets / Shipping State
  const [markets, setMarkets] = useState({
    taxPercentage: 15,
    allowInternationalSales: false
  });

  const categories = [
    { id: 'general', icon: Store, label: 'General', desc: 'Shop identity, support contact emails, address locations.' },
    { id: 'payments', icon: CreditCard, label: 'Payments', desc: 'Manage Scotiabank / NCB wires & WiPay credit card APIs.' },
    { id: 'notifications', icon: Bell, label: 'Notifications', desc: 'Config low stock thresholds and operational email logs.' },
    { id: 'security', icon: Shield, label: 'Security', desc: 'MFA protocols, IP logins logs, credentials strength metrics.' },
    { id: 'markets', icon: Globe, label: 'Markets & Taxes', desc: 'Manage currency, tax rate percentages (GCT), and trade permissions.' },
    { id: 'team', icon: ShieldCheck, label: 'Team & Permissions (RBAC)', desc: 'Manage granular dashboard roles and platform control parameters.' },
  ];

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    // Simulate Network Latency to check spinner state
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDiscard = () => {
    // Fast Reset
    if (activeTab === 'general') {
      setStoreInfo({
        name: 'Samkhi Limited',
        salesEmail: 'sales@samkhi.com',
        supportPhone: '+1 (876) 555-0199',
        currency: 'JMD (J$)',
        address: '12 Constant Spring Road, Kingston 10, Jamaica',
        timezone: 'GMT-5 (EST - Jamaica time)'
      });
    } else if (activeTab === 'payments') {
      setPayments({
        bankTransferEnabled: true,
        bankName: 'National Commercial Bank (NCB)',
        accountNumber: '402118274',
        accountType: 'Savings',
        accountName: 'Samkhi Limited Ltd',
        wipayEnabled: true,
        wipayApiKey: 'sk_live_samkhi_wipay82910aef',
        wipayAccountEmail: 'payments@samkhi.com',
        codEnabled: false
      });
    } else if (activeTab === 'notifications') {
      setNotifications({
        emailOnNewOrder: true,
        emailOnLowStock: true,
        smsOnShipment: false,
        weeklyReport: true,
        lowStockThreshold: 5
      });
    } else if (activeTab === 'security') {
      setSecurity({
        mfaEnabled: false,
        sessionTimeout: '60',
        ipWhitelist: '',
        requireStrongPasswords: true
      });
    } else if (activeTab === 'markets') {
      setMarkets({
        taxPercentage: 15,
        allowInternationalSales: false
      });
    }
  };

  return (
    <div className="p-8 max-w-[1000px] mx-auto pb-24 font-sans">
      
      {/* Active Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeTab !== 'overview' && (
            <button 
              type="button"
              onClick={() => setActiveTab('overview')}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shrink-0 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
              <Settings className="text-black" size={20} />
              Store Settings
            </h1>
            <p className="text-xs text-[#616161] mt-0.5">
              {activeTab === 'overview' 
                ? 'Configure overall store preferences, logistics variables, notification thresholds, and security locks.'
                : `Manage properties & specs for ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} configurations.`}
            </p>
          </div>
        </div>

        {activeTab !== 'overview' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[#a1a1a1] uppercase border border-slate-200 px-2.5 py-1 rounded bg-slate-50">
              Active: {activeTab} mode
            </span>
          </div>
        )}
      </div>

      {/* Main viewport */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          /* MAIN DIRECTORY VIEW */
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {categories.map((cat) => (
              <button 
                type="button"
                key={cat.id} 
                onClick={() => setActiveTab(cat.id as SettingTab)}
                className="bg-white p-6 rounded-xl border border-[#e3e3e3] shadow-xs hover:border-black/60 hover:shadow-md transition-all text-left flex gap-4 cursor-pointer group"
              >
                <div className="w-12 h-12 bg-slate-50 group-hover:bg-black group-hover:text-white rounded-lg flex items-center justify-center text-[#1a1a1a] shrink-0 border border-slate-200 group-hover:border-transparent transition-all">
                  <cat.icon size={22} />
                </div>
                <div>
                  <p className="font-bold text-[#1a1a1a] text-sm group-hover:text-black mb-1 flex items-center gap-1.5">
                    {cat.label}
                  </p>
                  <p className="text-[11px] text-[#616161] leading-relaxed select-none">{cat.desc}</p>
                </div>
              </button>
            ))}
          </motion.div>
        ) : activeTab === 'team' ? (
          /* EMBEDDED TEAM COMPONENT */
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <AdminTeam isEmbedded={true} />
          </motion.div>
        ) : (
          /* ACTIVE SUBFORM DISPLAY CARD */
          <motion.form 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSave}
            className="bg-white border border-[#e3e3e3] rounded-xl shadow-xs p-6 md:p-8 space-y-6 text-left"
          >
            {/* TAB NAME BANNER */}
            <div className="border-b border-[#f1f1f1] pb-4 mb-4 flex justify-between items-center bg-slate-50 -mx-6 -mt-6 p-6 md:-mx-8 md:-mt-8 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-black rounded-lg text-white">
                  {activeTab === 'general' && <Store size={18} />}
                  {activeTab === 'payments' && <CreditCard size={18} />}
                  {activeTab === 'notifications' && <Bell size={18} />}
                  {activeTab === 'security' && <Shield size={18} />}
                  {activeTab === 'markets' && <Globe size={18} />}
                </div>
                <div>
                  <h3 className="font-bold text-[#1a1a1a] text-sm capitalize">{activeTab} Details Information</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Parameters communicate directly with corresponding webhooks.</p>
                </div>
              </div>
            </div>

            {/* General Settings Subform */}
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#616161] uppercase tracking-wider font-mono">Store Title Name</label>
                  <input 
                    type="text" 
                    value={storeInfo.name}
                    onChange={e => setStoreInfo({...storeInfo, name: e.target.value})}
                    required
                    className="w-full border border-[#d1d1d1] rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black/5 outline-none font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#616161] uppercase tracking-wider font-mono">Support & Sales Email</label>
                  <input 
                    type="email" 
                    value={storeInfo.salesEmail}
                    onChange={e => setStoreInfo({...storeInfo, salesEmail: e.target.value})}
                    required
                    className="w-full border border-[#d1d1d1] rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black/5 outline-none font-medium font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#616161] uppercase tracking-wider font-mono">Contact Phone Number</label>
                  <input 
                    type="text" 
                    value={storeInfo.supportPhone}
                    onChange={e => setStoreInfo({...storeInfo, supportPhone: e.target.value})}
                    className="w-full border border-[#d1d1d1] rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black/5 outline-none font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#616161] uppercase tracking-wider font-mono">Base Currency Standard</label>
                  <select 
                    value={storeInfo.currency}
                    onChange={e => setStoreInfo({...storeInfo, currency: e.target.value})}
                    className="w-full border border-[#d1d1d1] bg-white rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black/5 outline-none font-bold"
                  >
                    <option value="JMD (J$)">Jamaican Dollar (JMD - J$)</option>
                    <option value="USD ($)">United States Dollar (USD - $)</option>
                    <option value="EUR (€)">Euro (EUR - €)</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="font-bold text-[#616161] uppercase tracking-wider font-mono">Physical Operational Headquarters Address</label>
                  <input 
                    type="text" 
                    value={storeInfo.address}
                    onChange={e => setStoreInfo({...storeInfo, address: e.target.value})}
                    className="w-full border border-[#d1d1d1] rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-black/5 outline-none font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#616161] uppercase tracking-wider font-mono">Default timezone region</label>
                  <input 
                    type="text" 
                    disabled
                    value={storeInfo.timezone}
                    className="w-full border border-slate-200 bg-slate-50 text-slate-550 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {/* Payments Settings Subform */}
            {activeTab === 'payments' && (
              <div className="space-y-6 text-xs text-left">
                {/* Bank wires Section */}
                <div className="p-4 bg-slate-50 border border-[#e3e3e3] rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-slate-800" />
                      <span className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider">Bank Wire Transfers (NCB / Scotiabank)</span>
                    </div>
                    <label className="flex items-center cursor-pointer gap-2 scale-90">
                      <input 
                        type="checkbox" 
                        checked={payments.bankTransferEnabled} 
                        onChange={e => setPayments({...payments, bankTransferEnabled: e.target.checked})}
                        className="accent-black h-4 w-4"
                      />
                      <span className="font-bold uppercase tracking-wider font-mono">Enabled</span>
                    </label>
                  </div>
                  
                  {payments.bankTransferEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="font-bold text-[#616161] uppercase tracking-wider font-mono text-[9px]">Account Beneficiary Full Name</label>
                        <input 
                          type="text" 
                          value={payments.accountName}
                          onChange={e => setPayments({...payments, accountName: e.target.value})}
                          className="w-full border border-[#d1d1d1] bg-white rounded-lg px-3 py-1.5 text-xs outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-[#616161] uppercase tracking-wider font-mono text-[9px]">Clearing Bank Name</label>
                        <input 
                          type="text" 
                          value={payments.bankName}
                          onChange={e => setPayments({...payments, bankName: e.target.value})}
                          className="w-full border border-[#d1d1d1] bg-white rounded-lg px-3 py-1.5 text-xs outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-[#616161] uppercase tracking-wider font-mono text-[9px]">Account Number Standard</label>
                        <input 
                          type="text" 
                          value={payments.accountNumber}
                          onChange={e => setPayments({...payments, accountNumber: e.target.value})}
                          className="w-full border border-[#d1d1d1] bg-white rounded-lg px-3 py-1.5 text-xs outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-[#616161] uppercase tracking-wider font-mono text-[9px]">Account Type Classification</label>
                        <select 
                          value={payments.accountType}
                          onChange={e => setPayments({...payments, accountType: e.target.value})}
                          className="w-full border border-[#d1d1d1] bg-white rounded-lg px-3 py-1.5 text-xs outline-none font-bold"
                        >
                          <option value="Savings">Savings Account</option>
                          <option value="Business Current">Business Current Account</option>
                          <option value="Chequing">Chequing Account</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* WiPay Section */}
                <div className="p-4 bg-slate-50 border border-[#e3e3e3] rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Coins size={16} className="text-indigo-600" />
                      <span className="font-bold text-indigo-950 font-mono text-[11px] uppercase tracking-wider">WiPay Caribbean credit cards gateway</span>
                    </div>
                    <label className="flex items-center cursor-pointer gap-2 scale-90">
                      <input 
                        type="checkbox" 
                        checked={payments.wipayEnabled} 
                        onChange={e => setPayments({...payments, wipayEnabled: e.target.checked})}
                        className="accent-indigo-600 h-4 w-4"
                      />
                      <span className="font-bold uppercase tracking-wider font-mono text-indigo-900">Enabled</span>
                    </label>
                  </div>
                  
                  {payments.wipayEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="font-bold text-[#616161] uppercase tracking-wider font-mono text-[9px]">Merchant Identifier Account Email</label>
                        <input 
                          type="email" 
                          value={payments.wipayAccountEmail}
                          onChange={e => setPayments({...payments, wipayAccountEmail: e.target.value})}
                          className="w-full border border-indigo-200 bg-white rounded-lg px-3 py-1.5 text-xs outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-[#616161] uppercase tracking-wider font-mono text-[9px]">Secret WiPay API key credentials</label>
                        <input 
                          type="password" 
                          value={payments.wipayApiKey}
                          onChange={e => setPayments({...payments, wipayApiKey: e.target.value})}
                          className="w-full border border-indigo-200 bg-white rounded-lg px-3 py-1.5 text-xs outline-none font-mono font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Delivery Options */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-[#e3e3e3] rounded-xl font-semibold">
                  <span className="text-slate-800">Support Cash On Delivery / Pickup settlements</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={payments.codEnabled}
                      onChange={e => setPayments({...payments, codEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Notifications Settings Subform */}
            {activeTab === 'notifications' && (
              <div className="space-y-4 text-xs text-left">
                <div className="p-4 bg-slate-50 border border-[#e3e3e3] rounded-xl space-y-4 font-semibold">
                  <h4 className="font-bold text-slate-900 font-mono float-left mb-1 uppercase tracking-wider">Dynamic Threshold levels</h4>
                  <div className="clear-both space-y-3 pt-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-700">Low Stock Notification alert limit:</span>
                      <span className="text-emerald-700 font-mono">{notifications.lowStockThreshold} units</span>
                    </div>
                    <input 
                      type="range" 
                      min="2" 
                      max="20" 
                      value={notifications.lowStockThreshold}
                      onChange={e => setNotifications({...notifications, lowStockThreshold: parseInt(e.target.value)})}
                      className="w-full accent-black h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 font-normal">Triggers alert signals within inventory view and pushes admin warnings.</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 bg-slate-50 border border-[#e3e3e3] rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between font-semibold pt-1">
                    <div className="flex items-center gap-2">
                      <Mail size={15} className="text-[#616161]" />
                      <span>Dispatch notification digest email on customer orders</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifications.emailOnNewOrder}
                      onChange={e => setNotifications({...notifications, emailOnNewOrder: e.target.checked})}
                      className="accent-black h-4 w-4 shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between font-semibold pt-3">
                    <div className="flex items-center gap-2">
                      <Mail size={15} className="text-[#616161]" />
                      <span>Dispatch alert messages immediately when item stock drop below threshold limit</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifications.emailOnLowStock}
                      onChange={e => setNotifications({...notifications, emailOnLowStock: e.target.checked})}
                      className="accent-black h-4 w-4 shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-between font-semibold pt-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={15} className="text-[#616161]" />
                      <span>Dispatch custom SMS updates to customer phone on shipment handover</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={notifications.smsOnShipment}
                      onChange={e => setNotifications({...notifications, smsOnShipment: e.target.checked})}
                      className="accent-black h-4 w-4 shrink-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings Subform */}
            {activeTab === 'security' && (
              <div className="space-y-4 text-xs text-left">
                <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-xl flex gap-3 text-amber-800 leading-normal">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-[11px]">
                    Security values here impact administrative and customer accounts databases. Be cautious when configuring lock durations or whitelists.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="font-bold text-[#616161] uppercase tracking-wider font-mono">Whitelisted IP access addresses</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 192.168.1.1, 204.88.92.3 (Leave empty for universal access)"
                      value={security.ipWhitelist}
                      onChange={e => setSecurity({...security, ipWhitelist: e.target.value})}
                      className="w-full border border-[#d1d1d1] rounded-lg px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-[#616161] uppercase tracking-wider font-mono">Inactive user session timeout limit</label>
                    <select 
                      value={security.sessionTimeout}
                      onChange={e => setSecurity({...security, sessionTimeout: e.target.value})}
                      className="w-full border border-[#d1d1d1] bg-white rounded-lg px-3 py-2 text-xs outline-none font-bold"
                    >
                      <option value="15">15 Minutes of inactivity</option>
                      <option value="30">30 Minutes of inactivity</option>
                      <option value="60">1 Hour of inactivity</option>
                      <option value="240">4 Hours of inactivity</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                      <input 
                        type="checkbox" 
                        checked={security.requireStrongPasswords}
                        onChange={e => setSecurity({...security, requireStrongPasswords: e.target.checked})}
                        className="accent-black h-4 w-4"
                      />
                      <span>Enforce strong password verification on login registers</span>
                    </label>
                  </div>
                </div>

                {/* Audit Trial Log List */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 font-mono text-[11px] uppercase tracking-wider">Security Guard Rails & Active Audit Logs</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-semibold px-2 py-0.5 rounded font-mono">Live Sync</span>
                  </div>

                  <div className="bg-slate-50 border border-[#e3e3e3] rounded-xl p-4.5 space-y-3 font-medium text-[11px] font-mono text-slate-700 max-h-48 overflow-y-auto">
                    {activityLogs.length > 0 ? (
                      activityLogs.map((log) => {
                        let timeStr = "";
                        if (log.timestamp) {
                          try {
                            const dateObj = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp.seconds * 1000);
                            timeStr = dateObj.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " JMD";
                          } catch (e) {
                            timeStr = new Date().toLocaleTimeString() + " JMD";
                          }
                        } else {
                          timeStr = "Live • " + (log.actor || "System");
                        }
                        return (
                          <div key={log.id || Math.random().toString()} className="flex justify-between hover:bg-slate-100/50 p-1 rounded transition-colors border-b border-slate-100/60 pb-1.5 flex-col md:flex-row gap-1">
                            <span className="text-slate-500 shrink-0">{timeStr} • {log.actor || 'System'}</span>
                            <span className="text-slate-900 font-bold font-sans text-right">{log.details || log.action}</span>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex justify-between hover:bg-slate-100/50 p-1 rounded transition-colors border-b border-slate-100/60 pb-1.5">
                          <span className="text-slate-500">10:14:24 AM JMD • sarah@gmail.com</span>
                          <span className="text-slate-900 font-bold font-sans">Updated Lithium battery pricing metrics</span>
                        </div>
                        <div className="flex justify-between hover:bg-slate-100/50 p-1 rounded transition-colors border-b border-slate-100/60 pb-1.5">
                          <span className="text-slate-500">09:44:11 AM JMD • evolvewebandai@gmail.com</span>
                          <span className="text-slate-900 font-bold font-sans">Authorized Manager email: sarah@gmail.com</span>
                        </div>
                        <div className="flex justify-between hover:bg-slate-100/50 p-1 rounded transition-colors border-b border-slate-100/60 pb-1.5">
                          <span className="text-slate-500">09:12:05 AM JMD • Route Firewall</span>
                          <span className="text-emerald-700 font-bold font-sans">IP lookup whitelist check passed (Kingston Gateway)</span>
                        </div>
                        <div className="flex justify-between hover:bg-slate-100/50 p-1 rounded transition-colors">
                          <span className="text-slate-500">08:00:15 AM JMD • System Daemon</span>
                          <span className="text-slate-900 font-bold font-sans">Connected successfully to Google Cloud Firestore</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Markets Settings Subform */}
            {activeTab === 'markets' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-left">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-bold text-[#616161] uppercase tracking-wider font-mono">Tax rate percentage GCT (Jamaica General Consumption Tax)</label>
                  <input 
                    type="number" 
                    value={markets.taxPercentage}
                    onChange={e => setMarkets({...markets, taxPercentage: Math.max(0, parseInt(e.target.value) || 0)})}
                    className="w-full border border-[#d1d1d1] rounded-lg px-3 py-2 text-xs outline-none font-mono font-bold"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-4 md:col-span-2 border-t mt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                    <input 
                      type="checkbox" 
                      className="accent-black h-4 w-4"
                      checked={markets.allowInternationalSales}
                      onChange={e => setMarkets({...markets, allowInternationalSales: e.target.checked})}
                    />
                    <span>Allow checkout order transactions from clients outside Jamaica (International)</span>
                  </label>
                </div>
              </div>
            )}

            {/* BUTTONS FOOTER */}
            <div className="mt-8 pt-6 border-t border-[#e3e3e3] flex justify-between items-center bg-slate-50 -mx-6 -mb-6 p-6 md:-mx-8 md:-mb-8 rounded-b-xl shrink-0">
              <div>
                <span className="text-[10px] font-mono text-slate-400">
                  * Local scope changes are temporarily cached during this test turn.
                </span>
              </div>
              
              <div className="flex gap-2.5">
                <button 
                  type="button"
                  onClick={handleDiscard}
                  className="bg-white border border-[#d1d1d1] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#f6f6f6] text-[#1e1e1e] transition-colors"
                >
                  Reset Defaults
                </button>
                
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-black text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-black/90 flex items-center gap-2 shadow-sm transition-all relative min-w-[130px] justify-center cursor-pointer"
                >
                  {saving && <Loader2 className="animate-spin" size={13} />}
                  {saveSuccess && <Check size={13} className="text-emerald-400 stroke-[3px]" />}
                  <span>{saving ? 'Saving...' : saveSuccess ? 'Saved successfully!' : 'Save Settings'}</span>
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* FOOTER GENERAL REMINDER NOTES */}
      {activeTab === 'overview' && (
        <div className="p-4 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl mt-8 text-left text-xs leading-relaxed">
          <span className="font-bold text-slate-800 block mb-0.5">Shopify Flow Settings Sync Policy</span>
          Administrative keys listed here are linked directly with secure system configurations including Knutsford express delivery rates, GCT tax factors, and merchant key pairs. Pushing "Save settings" updates relevant local caching layers seamlessly.
        </div>
      )}
    </div>
  );
}
