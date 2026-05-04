import React from 'react';
import { Settings, CreditCard, Bell, Shield, Store, Globe, User } from 'lucide-react';

export default function AdminSettings() {
  const categories = [
    { icon: Store, label: 'General', desc: 'View and update your store details' },
    { icon: User, label: 'Users & Permissions', desc: 'Manage what users can see or do' },
    { icon: CreditCard, label: 'Payments', desc: 'Manage payment providers and methods' },
    { icon: Bell, label: 'Notifications', desc: 'Control the messages sent to you and customers' },
    { icon: Shield, label: 'Security', desc: 'Manage your password and security settings' },
    { icon: Globe, label: 'Markets', desc: 'Manage international sales' },
  ];

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#1a1a1a]">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat, i) => (
          <button key={i} className="bg-white p-6 rounded-lg border border-[#e3e3e3] shadow-sm hover:border-[#b5b5b5] transition-all text-left flex gap-4">
            <div className="w-10 h-10 bg-[#f1f1f1] rounded-lg flex items-center justify-center text-[#1a1a1a] shrink-0">
              <cat.icon size={20} />
            </div>
            <div>
              <p className="font-bold text-[#1a1a1a] mb-1">{cat.label}</p>
              <p className="text-xs text-[#616161]">{cat.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-[#e3e3e3] flex justify-end gap-3">
        <button className="bg-white border border-[#d1d1d1] px-4 py-2 rounded-md text-sm font-medium hover:bg-[#f6f6f6]">
          Discard
        </button>
        <button className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-black/90">
          Save Settings
        </button>
      </div>
    </div>
  );
}
