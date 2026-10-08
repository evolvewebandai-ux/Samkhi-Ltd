import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  updatePassword,
  deleteUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth } from '../lib/auth';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';
import { Customer, SavedAddress, SavedPayment } from '../types';

export interface SimulatedEmail {
  id: string;
  type: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

interface CustomerAuthContextType {
  customerUser: User | null;
  customerProfile: Customer | null;
  loading: boolean;
  failedAttempts: Record<string, number>;
  isLocked: boolean;
  lockTimer: number;
  emails: SimulatedEmail[];
  cartCount: number;
  setCartCount: React.Dispatch<React.SetStateAction<number>>;
  loginWithEmail: (email: string, pass: string, rememberMe: boolean) => Promise<void>;
  registerWithEmail: (firstName: string, lastName: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  logoutCustomer: () => Promise<void>;
  updateProfile: (updates: Partial<Customer>) => Promise<void>;
  addAddress: (address: SavedAddress) => Promise<void>;
  updateAddress: (addressId: string, updates: Partial<SavedAddress>) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  deleteCustomerAccount: () => Promise<void>;
  addWishlistItem: (productId: string) => Promise<void>;
  removeWishlistItem: (productId: string) => Promise<void>;
  triggerEmailNotification: (type: 'welcome' | 'password_reset' | 'order_confirm' | 'shipping_update' | 'delivery_confirm' | 'review_request', toEmail: string, data: any) => void;
  clearEmailLogs: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customerUser, setCustomerUser] = useState<User | null>(null);
  const [customerProfile, setCustomerProfile] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('samkhi_failed_attempts');
    return saved ? JSON.parse(saved) : {};
  });
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [emails, setEmails] = useState<SimulatedEmail[]>(() => {
    const saved = localStorage.getItem('samkhi_emails');
    return saved ? JSON.parse(saved) : [];
  });
  const [cartCount, setCartCount] = useState(0);

  // Filter lockouts on initialization and handle timer countdown
  useEffect(() => {
    const lockExpiry = localStorage.getItem('samkhi_lock_expiry');
    if (lockExpiry) {
      const remaining = Math.ceil((parseInt(lockExpiry) - Date.now()) / 1000);
      if (remaining > 0) {
        setIsLocked(true);
        setLockTimer(remaining);
      } else {
        localStorage.removeItem('samkhi_lock_expiry');
      }
    }
  }, []);

  useEffect(() => {
    if (lockTimer > 0) {
      const interval = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            localStorage.removeItem('samkhi_lock_expiry');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockTimer]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCustomerUser(user);
      if (!user) {
        setCustomerProfile(null);
        setLoading(false);
        return;
      }

      const email = user.email || '';
      const custId = email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const profileRef = doc(db, 'customers', custId);

      try {
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          setCustomerProfile({ ...snap.data(), id: custId } as Customer);
        } else {
          // If no profile, auto-initialize from authenticated user metadata
          const nameParts = user.displayName ? user.displayName.split(' ') : ['', ''];
          const firstName = nameParts[0] || 'Store';
          const lastName = nameParts[1] || 'Guest';
          const defaultProfile: Customer = {
            id: custId,
            name: user.displayName || 'Valued Customer',
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone: user.phoneNumber || '',
            location: 'Jamaica',
            orders: 0,
            spent: 0,
            lastOrder: 'None',
            wishlist: [],
            addresses: [],
            savedPayments: [
              { id: 'pay_1', brand: 'Visa', expiry: '11/29', last4: '4392' },
              { id: 'pay_2', brand: 'Mastercard', expiry: '06/28', last4: '2810' }
            ],
            emailPreferences: {
              promotional: true,
              orderUpdates: true,
              reviews: true
            }
          };

          await setDoc(profileRef, defaultProfile);
          setCustomerProfile(defaultProfile);

          // Trigger Welcome Email
          triggerEmailNotification('welcome', email, { name: defaultProfile.name });
        }
      } catch (err) {
        console.error("Error managing customer profile loading:", err);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Email Notification Simulator
  const triggerEmailNotification = (
    type: 'welcome' | 'password_reset' | 'order_confirm' | 'shipping_update' | 'delivery_confirm' | 'review_request',
    toEmail: string,
    data: any
  ) => {
    const subjects = {
      welcome: "🌟 Welcome to Samkhi Limited! Your Energy Adventure Starts Now",
      password_reset: "🔐 Reset Your Samkhi Customer Password",
      order_confirm: `📦 Order Confirmed ${data?.orderId || ''} - Samkhi Limited`,
      shipping_update: "🚚 Your Samkhi Order has been Shipped!",
      delivery_confirm: "🎉 Your Samkhi Order has been Delivered!",
      review_request: "✍️ Review your energy products from Samkhi Limited"
    };

    const bodies = {
      welcome: `Hello ${data?.name || 'Valued Customer'},\n\nWelcome to Samkhi Limited, Jamaica's premier solar & lighting boutique store! We are thrilled to guide you on your carbon-neutral path.\n\nExperience clean, reliable energy for your home or business with Samkhi.\n\nBest Regards,\nThe Samkhi Support Team`,
      password_reset: `Hello,\n\nWe received a request to reset your password. Please click the link below to change it:\n\n[https://samkhi-energy.jm/reset-password?token=sec_res_29471389]\n\nThis link will automatically expire in 1 hour (as of 2026-06-06).\n\nIf you did not make this request, please disregard this email securely.`,
      order_confirm: `Hi,\n\nThank you for shopping at Samkhi Limited! Your order ${data?.orderId || '#10291'} has been successfully placed.\n\nWe've matched previous order lookup to your account. You can track full shipping status inside your Dashboard!\n\nTotal Paid: JMD $${data?.total?.toLocaleString()}`,
      shipping_update: `Great news!\n\nYour Samkhi Order ${data?.orderId || '#10291'} has been shipped!\n\nCarrier: Jamaica Post / DHL Express\nTracking Number: ${data?.trackingNumber || 'JM-89743-DH'}\n\nTrack your live delivery directly in your online account cabinet.`,
      delivery_confirm: `Delivered!\n\nYour Order ${data?.orderId || '#10291'} has been marked as fully delivered.\n\nWe hope you absolutely love your eco-friendly products. Let us know if we can offer any technical support.`,
      review_request: `Hi ${data?.name || 'Customer'},\n\nIt's been 3 days since your delivery!\n\nWe'd love to hear your feedback about your new energy-saving solutions. Click the button inside your dashboard to write an official site review.\n\nCheers!`
    };

    const newEmail: SimulatedEmail = {
      id: `mail_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      to: toEmail,
      subject: subjects[type] || "Store Alert",
      body: bodies[type] || "",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    const updated = [newEmail, ...emails].slice(0, 30);
    setEmails(updated);
    localStorage.setItem('samkhi_emails', JSON.stringify(updated));

    // Custom browser notifications
    const sound = {
      welcome: "🌟", password_reset: "🔐", order_confirm: "📦", shipping_update: "🚚", delivery_confirm: "🎉", review_request: "✍️"
    }[type];
    
    console.log(`%c[SIMULATED MAIL SERVICE] to: ${toEmail} | Subject: ${newEmail.subject}`, "background: #0B2E59; color: #fff; padding: 4px; border-radius: 4px");

    // Display fancy notification on screen
    const toastDiv = document.createElement('div');
    toastDiv.className = "fixed top-5 right-5 z-[200] max-w-sm bg-secondary text-white p-4 rounded-xl shadow-2xl animate-bounce border-l-4 border-cta transition-transform overflow-hidden font-sans";
    toastDiv.innerHTML = `
      <div class="flex gap-3">
        <span class="text-2xl">${sound}</span>
        <div>
          <h4 class="font-bold text-xs uppercase tracking-wider text-cta">Simulated Email Dispatched</h4>
          <p class="text-xs font-semibold mt-1 line-clamp-1">${newEmail.subject}</p>
          <p class="text-[10px] text-slate-300 mt-1">Sent to: ${toEmail}</p>
        </div>
      </div>
    `;
    document.body.appendChild(toastDiv);
    setTimeout(() => {
      toastDiv.classList.add('opacity-0', 'translate-y-[-10px]');
      setTimeout(() => {
        document.body.removeChild(toastDiv);
      }, 500);
    }, 4500);
  };

  const clearEmailLogs = () => {
    setEmails([]);
    localStorage.removeItem('samkhi_emails');
  };

  // Login handler
  const loginWithEmail = async (email: string, pass: string, rememberMe: boolean) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check custom rate limiter
    if (isLocked) {
      throw new Error(`This terminal is temporarily locked. Please wait ${lockTimer} seconds.`);
    }

    const emailAttempts = failedAttempts[cleanEmail] || 0;
    if (emailAttempts >= 5) {
      const lockExpiry = Date.now() + 5 * 60 * 1000; // 5 minute lock
      localStorage.setItem('samkhi_lock_expiry', lockExpiry.toString());
      setIsLocked(true);
      setLockTimer(300);
      throw new Error("Too many failed credentials. Account temporarily locked for 5 minutes.");
    }

    try {
      // Setup Firebase persistence based on Remember Me checkbox
      const mode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, mode);
      
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      
      // Clear failed attempts counter
      const updatedAttempts = { ...failedAttempts };
      delete updatedAttempts[cleanEmail];
      setFailedAttempts(updatedAttempts);
      localStorage.setItem('samkhi_failed_attempts', JSON.stringify(updatedAttempts));
    } catch (err: any) {
      // Increment failed attempts
      const newAttempts = { ...failedAttempts, [cleanEmail]: emailAttempts + 1 };
      setFailedAttempts(newAttempts);
      localStorage.setItem('samkhi_failed_attempts', JSON.stringify(newAttempts));

      if (emailAttempts + 1 >= 5) {
        const lockExpiry = Date.now() + 5 * 60 * 1000;
        localStorage.setItem('samkhi_lock_expiry', lockExpiry.toString());
        setIsLocked(true);
        setLockTimer(300);
        throw new Error("Too many failed credentials. Account temporarily locked for 5 minutes.");
      }

      throw new Error(err.message || "Invalid email or password.");
    }
  };

  // Sign up handler
  const registerWithEmail = async (firstName: string, lastName: string, email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const user = userCred.user;
      
      // Setup default billing profile in Firestore and sync with previously matched guest checkout 
      const custId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const profileRef = doc(db, 'customers', custId);
      
      const defaultProfile: Customer = {
        id: custId,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        email: cleanEmail,
        location: 'Jamaica',
        orders: 0,
        spent: 0,
        lastOrder: 'None',
        wishlist: [],
        addresses: [],
        savedPayments: [
          { id: 'pay_1', brand: 'Visa', expiry: '11/29', last4: '4392' }
        ],
        emailPreferences: {
          promotional: true,
          orderUpdates: true,
          reviews: true
        }
      };

      await setDoc(profileRef, defaultProfile);
      setCustomerProfile(defaultProfile);

      // Trigger Welcome Email
      triggerEmailNotification('welcome', cleanEmail, { name: defaultProfile.name });
    } catch (err: any) {
      throw new Error(err.message || "Could not complete registration.");
    }
  };

  // Google Single Sign-On
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      throw new Error(err.message || "Google single sign-on failed.");
    }
  };

  // Trigger real or simulated email link for Passwordless login
  const sendMagicLink = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      // For standard preview tab environments, we construct an beautiful simulated email log
      triggerEmailNotification('password_reset', cleanEmail, { name: cleanEmail.split('@')[0] });
    } catch (err: any) {
      throw new Error("Unable to dispatch magic link. Please check your credentials.");
    }
  };

  // Dispatch password reset email
  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      triggerEmailNotification('password_reset', cleanEmail, {});
    } catch (err: any) {
      // Fallback: simulated service
      triggerEmailNotification('password_reset', cleanEmail, {});
    }
  };

  // Logout handler
  const logoutCustomer = async () => {
    try {
      await signOut(auth);
      setCustomerUser(null);
      setCustomerProfile(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Profile data updates
  const updateProfile = async (updates: Partial<Customer>) => {
    if (!customerProfile) return;
    const custId = customerProfile.id;
    const path = `customers/${custId}`;
    const cleanUpdates = cleanUndefined(updates);
    try {
      await updateDoc(doc(db, 'customers', custId), cleanUpdates);
      setCustomerProfile((prev) => prev ? { ...prev, ...updates } : null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  // Address CRUD
  const addAddress = async (address: SavedAddress) => {
    if (!customerProfile) return;
    const currentList = customerProfile.addresses || [];
    let updated = [...currentList];
    if (address.isDefault) {
      updated = updated.map(addr => ({ ...addr, isDefault: false }));
    }
    updated.push(address);
    await updateProfile({ addresses: updated });
  };

  const updateAddress = async (addressId: string, updates: Partial<SavedAddress>) => {
    if (!customerProfile) return;
    const currentList = customerProfile.addresses || [];
    let updated = currentList.map(addr => {
      if (addr.id === addressId) {
        return { ...addr, ...updates };
      }
      return addr;
    });
    if (updates.isDefault) {
      updated = updated.map(addr => addr.id === addressId ? addr : { ...addr, isDefault: false });
    }
    await updateProfile({ addresses: updated });
  };

  const deleteAddress = async (addressId: string) => {
    if (!customerProfile) return;
    const currentList = customerProfile.addresses || [];
    const updated = currentList.filter(addr => addr.id !== addressId);
    await updateProfile({ addresses: updated });
  };

  // Wishlist Handling
  const addWishlistItem = async (productId: string) => {
    if (!customerProfile) return;
    const current = customerProfile.wishlist || [];
    if (!current.includes(productId)) {
      await updateProfile({ wishlist: [...current, productId] });
    }
  };

  const removeWishlistItem = async (productId: string) => {
    if (!customerProfile) return;
    const current = customerProfile.wishlist || [];
    await updateProfile({ wishlist: current.filter(id => id !== productId) });
  };

  // Delete Customer login account option
  const deleteCustomerAccount = async () => {
    if (!customerUser || !customerProfile) return;
    const custId = customerProfile.id;
    try {
      await deleteDoc(doc(db, 'customers', custId));
      await deleteUser(customerUser);
      setCustomerUser(null);
      setCustomerProfile(null);
    } catch (e: any) {
      // Re-authentication may represent a requirement, delete user data from Firestore anyway
      await deleteDoc(doc(db, 'customers', custId));
      await signOut(auth);
      setCustomerUser(null);
      setCustomerProfile(null);
    }
  };

  return (
    <CustomerAuthContext.Provider value={{
      customerUser,
      customerProfile,
      loading,
      failedAttempts,
      isLocked,
      lockTimer,
      emails,
      cartCount,
      setCartCount,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      sendPasswordReset,
      sendMagicLink,
      logoutCustomer,
      updateProfile,
      addAddress,
      updateAddress,
      deleteAddress,
      deleteCustomerAccount,
      addWishlistItem,
      removeWishlistItem,
      triggerEmailNotification,
      clearEmailLogs
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

// Minimal polyfill for deleteDoc from SDK
import { deleteDoc } from 'firebase/firestore';
