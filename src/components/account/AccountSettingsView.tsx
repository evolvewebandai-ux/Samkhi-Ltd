import { useState } from 'react';
import { User, Phone, MapPin, Key, CreditCard, Mail, Trash2, X, AlertTriangle, Plus, Check } from 'lucide-react';
import { Customer, SavedAddress, SavedPayment } from '../../types';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { updatePassword } from 'firebase/auth';
import { auth } from '../../lib/auth';

interface AccountSettingsViewProps {
  profile: Customer;
  onUpdateProfile: (updates: Partial<Customer>) => Promise<void>;
  onAddAddress: (address: SavedAddress) => Promise<void>;
  onUpdateAddress: (addressId: string, updates: Partial<SavedAddress>) => Promise<void>;
  onDeleteAddress: (addressId: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export default function AccountSettingsView({
  profile,
  onUpdateProfile,
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
  onDeleteAccount
}: AccountSettingsViewProps) {
  const { customerUser } = useCustomerAuth();
  
  // Tab states for Sub-settings pages
  const [subTab, setSubTab] = useState<'profile' | 'addresses' | 'security' | 'preferences'>('profile');

  // Profile Form States
  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [location, setLocation] = useState(profile.location || 'Jamaica');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Address Dialog states
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addrName, setAddrName] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrParish, setAddrParish] = useState('St. Ann');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrDefault, setAddrDefault] = useState(false);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Email Notification Preferences Checkboxes
  const [prefPromo, setPrefPromo] = useState(profile.emailPreferences?.promotional ?? true);
  const [prefOrder, setPrefOrder] = useState(profile.emailPreferences?.orderUpdates ?? true);
  const [prefRev, setPrefRev] = useState(profile.emailPreferences?.reviews ?? true);
  const [prefSaving, setPrefSaving] = useState(false);

  // Saved mock payments list state (local delete view simulation)
  const [payments, setPayments] = useState<SavedPayment[]>(profile.savedPayments || []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      await onUpdateProfile({
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        phone,
        location
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2000);
    } catch {
      alert("Failed updating profile settings.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("Password must match strength threshold rules (min. 8 chars).");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Password inputs do not match.");
      return;
    }

    if (!customerUser) return;
    
    setPasswordSaving(true);
    try {
      await updatePassword(customerUser, newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || "Unable to update password. Authentication session may be stale.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet || !addrPhone) return;

    const payload: SavedAddress = {
      id: editingAddress?.id || `addr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: addrName || 'Shipping Address',
      street: addrStreet,
      parish: addrParish,
      phone: addrPhone,
      isDefault: addrDefault
    };

    try {
      if (editingAddress) {
        await onUpdateAddress(editingAddress.id, payload);
      } else {
        await onAddAddress(payload);
      }
      setShowAddressModal(false);
      setEditingAddress(null);
      // reset
      setAddrName('');
      setAddrStreet('');
      setAddrPhone('');
      setAddrDefault(false);
    } catch {
      alert("Error saving destination address.");
    }
  };

  const handleEditAddressButton = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setAddrName(addr.name);
    setAddrStreet(addr.street);
    setAddrParish(addr.parish);
    setAddrPhone(addr.phone);
    setAddrDefault(addr.isDefault);
    setShowAddressModal(true);
  };

  const handleDeleteAddressButton = async (id: string) => {
    if (confirm("Are you sure you want to remove this address?")) {
      await onDeleteAddress(id);
    }
  };

  const handleSavePreferences = async () => {
    setPrefSaving(true);
    try {
      await onUpdateProfile({
        emailPreferences: {
          promotional: prefPromo,
          orderUpdates: prefOrder,
          reviews: prefRev
        }
      });
      alert("Preferences saved successfully!");
    } catch {
      alert("Failed saving notification preferences.");
    } finally {
      setPrefSaving(false);
    }
  };

  const handlePaymentRemove = (id: string) => {
    if (confirm("Remove this saved tokenized payment method? Future checkouts will require inputting details again.")) {
      const updated = payments.filter(pm => pm.id !== id);
      setPayments(updated);
      onUpdateProfile({ savedPayments: updated });
    }
  };

  const handleDeleteAccountFinal = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert("Verification keyword is incorrect.");
      return;
    }
    setDeleting(true);
    try {
      await onDeleteAccount();
    } catch {
      alert("Please re-authenticate and try deleting your account again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Settings Navigation Tabs Row */}
      <div className="flex border-b border-slate-100 overflow-x-auto whitespace-nowrap gap-6 pb-1">
        {[
          { key: 'profile', label: 'My Profile', icon: User },
          { key: 'addresses', label: 'Saved Addresses', icon: MapPin },
          { key: 'security', label: 'Login Security', icon: Key },
          { key: 'preferences', label: 'Subscriptions', icon: Mail }
        ].map((tab) => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key as any)}
              className={`flex items-center gap-2 pb-3.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                subTab === tab.key 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <IconComp size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* SUB-SETTING: GENERAL PROFILE */}
      {subTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-enterprise">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">First Name</label>
              <input 
                type="text" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Last Name</label>
              <input 
                type="text" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Phone Contact</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400"><Phone size={14} /></span>
              <input 
                type="text" 
                placeholder="e.g. +1 876-630-3350"
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Registered Parish</label>
            <input 
              type="text" 
              placeholder="St. Ann, Jamaica"
              value={location} 
              disabled
              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 text-sm cursor-not-allowed font-semibold"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            {profileSuccess && (
              <span className="text-xs text-primary font-bold flex items-center gap-1">
                <Check size={14} /> Profile updated successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={profileSaving}
              className="btn-primary py-2 px-5 ml-auto text-xs uppercase font-extrabold tracking-wider"
            >
              {profileSaving ? "Saving..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      )}

      {/* SUB-SETTING: ADDRESSES CRUD */}
      {subTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-display font-bold text-sm text-secondary">Manage Saved Shipping Destination</h4>
            <button
              onClick={() => {
                setEditingAddress(null);
                setAddrName('');
                setAddrStreet('');
                setAddrPhone('');
                setAddrDefault(false);
                setShowAddressModal(true);
              }}
              className="bg-primary hover:bg-primary-accent text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus size={14} /> Add New Address
            </button>
          </div>

          {(!profile.addresses || profile.addresses.length === 0) ? (
            <div className="bg-slate-50 rounded-3xl p-8 border border-dashed border-slate-200 text-center">
              <MapPin size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">No shipping addresses saved yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.addresses.map((addr) => (
                <div key={addr.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-enterprise relative overflow-hidden">
                  {addr.isDefault && (
                    <span className="absolute top-0 right-0 bg-primary/20 text-primary text-[9px] font-black uppercase px-2.5 py-1 rounded-bl-xl tracking-wider">
                      Default Shipping
                    </span>
                  )}
                  <h5 className="font-display font-extrabold text-xs text-secondary mb-1.5 uppercase tracking-wide">{addr.name}</h5>
                  <p className="text-xs text-slate-600 italic font-medium leading-relaxed mb-1">{addr.street}</p>
                  <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">{addr.parish}, JAMAICA</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Ph: {addr.phone}</p>
                  
                  <div className="flex gap-4 pt-4 mt-4 border-t border-slate-50 text-[10px] uppercase font-bold tracking-wider">
                    <button onClick={() => handleEditAddressButton(addr)} className="text-secondary hover:text-primary transition-all cursor-pointer">
                      Modifies
                    </button>
                    <button onClick={() => handleDeleteAddressButton(addr.id)} className="text-red-500 hover:text-red-700 transition-all cursor-pointer">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-SETTING: LOGIN SECURITY */}
      {subTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handlePasswordSubmit} className="space-y-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-enterprise">
            <h4 className="font-display font-black text-sm text-secondary border-b border-secondary/5 pb-2.5">Update Password</h4>
            
            {passwordError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-bold">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-green-50 text-primary text-xs rounded-xl font-bold">
                ✓ Success! Your account password has been updated securely.
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">New Password (8 chars min)</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Confirm New Password</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={passwordSaving}
              className="btn-secondary py-2.5 px-5 text-xs uppercase font-extrabold tracking-wider ml-auto block"
            >
              {passwordSaving ? "Updating State..." : "Change Account Password"}
            </button>
          </form>

          {/* Saved Payment Methods Details */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-enterprise space-y-4">
            <h4 className="font-display font-black text-sm text-secondary border-b border-secondary/5 pb-2.5">Tokenized Saved Payments</h4>
            
            <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
              For complete zero-trust PCI-compliance, we strictly NEVER store card parameters. Credit preferences are handled securely via token reference pointers.
            </p>

            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4 font-semibold">No saved payment methods reference.</p>
            ) : (
              <div className="space-y-3">
                {payments.map(pm => (
                  <div key={pm.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                        <CreditCard size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-secondary">{pm.brand} ending on {pm.last4}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Expires: {pm.expiry}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handlePaymentRemove(pm.id)}
                      className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DELETE ACCOUNT CONTAINER */}
          <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6 shadow-enterprise space-y-4">
            <h4 className="font-display font-black text-sm text-red-900 flex items-center gap-1.5">
              <AlertTriangle size={18} /> Danger Operations Cabinet
            </h4>
            <p className="text-xs text-red-800 leading-relaxed font-semibold">
              Erase customer profile database records permanently. Streak history counters, order linkages, and address references will be dissolved forever.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors hover:bg-red-800 cursor-pointer"
            >
              Request Account Deletion
            </button>
          </div>
        </div>
      )}

      {/* SUB-SETTING: PREFERENCES */}
      {subTab === 'preferences' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-enterprise space-y-6">
          <div>
            <h4 className="font-display font-black text-sm text-secondary">Notification preferences</h4>
            <p className="text-xs text-slate-400 mt-1">Select what email notifications you prefer receiving</p>
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefPromo} 
                onChange={(e) => setPrefPromo(e.target.checked)}
                className="rounded border-slate-300 text-primary w-4 h-4 cursor-pointer mt-0.5"
              />
              <div>
                <p className="text-xs font-bold text-secondary">Eco newsletters, sales, and coupons</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Receive occasional limited-time discounts for solar accessories.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefOrder} 
                onChange={(e) => setPrefOrder(e.target.checked)}
                className="rounded border-slate-300 text-primary w-4 h-4 cursor-pointer mt-0.5" 
              />
              <div>
                <p className="text-xs font-bold text-secondary">Timeline Shipping Updates</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Recommended. Automatically fetch parcel status notifications.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefRev} 
                onChange={(e) => setPrefRev(e.target.checked)}
                className="rounded border-slate-300 text-primary w-4 h-4 cursor-pointer mt-0.5"
              />
              <div>
                <p className="text-xs font-bold text-secondary">Product feedback request</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Dispatches review links 3 days post delivery for helpful community feedback.</p>
              </div>
            </label>
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={prefSaving}
            className="btn-primary py-2.5 px-5 ml-auto text-xs uppercase font-extrabold tracking-wider block"
          >
            {prefSaving ? "Updating Preferences..." : "Save Preferences"}
          </button>
        </div>
      )}

      {/* CREATE / EDIT shipping address Modal overlay popup */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-secondary text-white p-5 flex justify-between items-center">
              <h3 className="font-display font-extrabold text-sm uppercase tracking-wider">
                {editingAddress ? "Modify Shipping Destination" : "New Delivery Address"}
              </h3>
              <button onClick={() => setShowAddressModal(false)} className="p-1 hover:bg-white/10 rounded-full text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">Preset Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Home, Office, Ocho Rios Store"
                  value={addrName}
                  onChange={(e) => setAddrName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">Street Address</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. 15 DaCosta Drive, Shop #4"
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">Jamaica Parish</label>
                <select
                  value={addrParish}
                  onChange={(e) => setAddrParish(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                >
                  {['Kingston', 'St. Andrew', 'St. Ann', 'St. James', 'Westmoreland', 'Manchester', 'Clarendon', 'St. Catherine', 'Portland', 'St. Mary', 'St. Elizabeth', 'Trelawny', 'Hanover', 'St. Thomas'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">Contact Phone</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. 1-876-000-0000"
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={addrDefault} 
                  onChange={(e) => setAddrDefault(e.target.checked)}
                  className="rounded border-slate-300 text-primary w-4 h-4 mt-0.5 cursor-pointer"
                />
                Set Default delivery preset
              </label>

              <button
                type="submit"
                className="w-full btn-primary py-3 text-xs uppercase"
              >
                Save Shipping Address
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FINAL DELETE USER ACCOUNT MODAL popups */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-red-950 text-white p-5 flex justify-between items-center">
              <h3 className="font-display font-black text-sm uppercase flex items-center gap-2">
                <AlertTriangle size={18} className="text-cta animate-pulse" /> Final Confirmation
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="p-1 hover:bg-white/10 rounded-full text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                To confirm account erasure, type the verification check word <span className="text-red-600 font-bold bg-slate-50 px-2 py-0.5 border border-red-150 rounded">DELETE</span> carefully below:
              </p>

              <input 
                type="text" 
                placeholder="Type 'DELETE'"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-2.5 bg-red-50/50 border border-red-150 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 font-bold tracking-wider text-center uppercase"
              />

              <button
                onClick={handleDeleteAccountFinal}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white py-3 rounded-xl text-xs font-bold uppercase"
              >
                {deleting ? "Deleting in progress..." : "Confirm Permanently Erase My Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
