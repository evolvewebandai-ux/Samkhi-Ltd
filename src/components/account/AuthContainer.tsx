import { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldAlert, Check, HelpCircle, Chrome, Key, Mail, Sparkles, Loader2, FileText, ArrowRight } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Order } from '../../types';

interface AuthContainerProps {
  onGuestLookup: (order: Order) => void;
  onLoginSuccess: () => void;
}

export default function AuthContainer({ onGuestLookup, onLoginSuccess }: AuthContainerProps) {
  const { 
    loginWithEmail, 
    registerWithEmail, 
    loginWithGoogle, 
    sendPasswordReset, 
    sendMagicLink, 
    isLocked, 
    lockTimer 
  } = useCustomerAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Guest Order Tracker inputs
  const [guestOrderId, setGuestOrderId] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);

  // Previous orders check to prompt linking
  const [preCheckedOrdersCount, setPreCheckedOrdersCount] = useState(0);

  // Password structural strength tracker
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    number: false,
    special: false,
    upper: false
  });

  useEffect(() => {
    if (mode === 'signup') {
      setPasswordStrength({
        length: password.length >= 8,
        number: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
        upper: /[A-Z]/.test(password)
      });
    }
  }, [password, mode]);

  // Check if there are orders for this email before signup completed
  const handleEmailCheckForGuestOrders = async (checkEmail: string) => {
    if (!checkEmail || !checkEmail.includes('@')) return;
    try {
      const q = query(collection(db, 'orders'), where('customerEmail', '==', checkEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      setPreCheckedOrdersCount(snap.size);
    } catch {
      setPreCheckedOrdersCount(0);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error("Please fill in both email and password fields.");
      }
      await loginWithEmail(email, password, rememberMe);
      setSuccess("Successfully connected! Welcome back.");
      setTimeout(() => {
        onLoginSuccess();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Credential validation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName || !lastName || !email || !password) {
      setError("Please complete all required field boxes.");
      return;
    }

    const { length, number, special, upper } = passwordStrength;
    if (!length || !number || !special || !upper) {
      setError("Please reinforce your password strength requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password inputs do not match.");
      return;
    }

    if (!acceptTerms) {
      setError("Please confirm acceptance of our terms of service and privacy policy.");
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(firstName, lastName, email, password);
      setSuccess("Account registered successfully!");
      setTimeout(() => {
        onLoginSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccess("A password reset link was dispatched to your email! Link expires in 1 hour.");
    } catch (err: any) {
      setError(err.message || "Reset request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Please provide an email for passwordless sign-in.");
      return;
    }

    setLoading(true);
    try {
      await sendMagicLink(email);
      setSuccess("✨ A connection verification link was dispatched! Check your simulated inbox.");
    } catch (err: any) {
      setError(err.message || "Connection request failed.");
    } finally {
      setLoading(false);
    }
  };

  // Guest Order matching
  const handleGuestTrackerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError(null);
    setGuestLoading(true);

    const formattedId = guestOrderId.trim();
    const formattedEmail = guestEmail.trim().toLowerCase();

    if (!formattedId || !formattedEmail) {
      setGuestError("Please specify both order number and checkout email.");
      setGuestLoading(false);
      return;
    }

    try {
      const docRef = doc(db, 'orders', formattedId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const orderData = { ...docSnap.data(), id: docSnap.id } as Order;
        if (orderData.customerEmail.toLowerCase().trim() === formattedEmail) {
          onGuestLookup(orderData);
        } else {
          setGuestError("Email address does not match this order registration details.");
        }
      } else {
        // Search by lower string reference or tag
        const q = query(collection(db, 'orders'), where('customerEmail', '==', formattedEmail));
        const qSnap = await getDocs(q);
        const matched = qSnap.docs.find(d => d.id === formattedId || d.id.toLowerCase() === formattedId.toLowerCase());
        
        if (matched) {
          onGuestLookup({ ...matched.data(), id: matched.id } as Order);
        } else {
          setGuestError("Order number not found. Check formatting (e.g. #40441).");
        }
      }
    } catch (err: any) {
      setGuestError("Unable to retrieve order details securely.");
    } finally {
      setGuestLoading(false);
    }
  };

  const getStrengthScore = () => {
    return Object.values(passwordStrength).filter(Boolean).length;
  };

  const strengthScore = getStrengthScore();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start font-sans">
      
      {/* Col 1: Main Authenticator Box (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-3xl shadow-enterprise border border-slate-100 overflow-hidden transition-all duration-300">
        
        {/* Banner header logo */}
        <div className="bg-secondary p-8 flex flex-col items-center border-b border-slate-100 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-10" />
          <img 
            src="https://lh3.googleusercontent.com/d/1y5j5nsQpvc5Rgdo2OP_ZN6K9sAqMg3Uw" 
            alt="Samkhi Limited"
            className="h-16 md:h-20 object-contain drop-shadow-md relative z-10 transition-transform hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <h2 className="font-display font-bold text-2xl text-white mt-4 relative z-10">
            {mode === 'signin' && "Welcome Back"}
            {mode === 'signup' && "Create Account"}
            {mode === 'forgot' && "Account Recovery"}
            {mode === 'magic' && "Passwordless Sign-In"}
          </h2>
          <p className="text-cta text-xs uppercase tracking-[0.25em] font-extrabold mt-1 relative z-10">
            {mode === 'signin' && "Match orders, log points & track packages"}
            {mode === 'signup' && "Earn 150 points instantly"}
            {mode === 'forgot' && "Send reset link in 2 seconds"}
            {mode === 'magic' && "Fast, keyless portal access"}
          </p>
        </div>

        {/* Content body */}
        <div className="p-6 md:p-10">
          
          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm flex items-center gap-3 animate-fade-in">
              <ShieldAlert size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-primary rounded-xl text-slate-800 text-sm flex items-center gap-3 animate-fade-in">
              <Sparkles size={20} className="shrink-0 text-primary-accent" />
              <span>{success}</span>
            </div>
          )}

          {isLocked && (
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-cta rounded-xl text-amber-900 text-sm flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="shrink-0 text-amber-600" />
                <span className="font-bold">Terminal Lockout Active</span>
              </div>
              <p className="text-xs">
                Too many failed login attempts have locked authentication. Remaining cool-down window: 
                <span className="font-mono font-bold text-base bg-white px-2 py-0.5 rounded ml-2 border border-amber-200">{lockTimer}s</span>
              </p>
            </div>
          )}

          {/* SIGN IN VIEW */}
          {mode === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">@</span>
                  <input 
                    type="email"
                    required
                    autoFocus
                    placeholder="e.g. pamela@yahoo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Password</label>
                  <button 
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs font-bold text-primary hover:text-primary-accent transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer"
                  />
                  Remember Me (30 Days)
                </label>
                <button
                  type="button"
                  onClick={() => setMode('magic')}
                  className="text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Sparkles size={13} className="text-cta" /> Passwordless link
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || isLocked}
                className="w-full btn-secondary py-3.5 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 mt-2 font-bold tracking-wide uppercase text-xs"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign In to Dashboard"}
              </button>

              <div className="relative my-6 flex items-center justify-center">
                <div className="border-t border-slate-100 w-full absolute" />
                <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-widest relative">or</span>
              </div>

              <button
                type="button"
                onClick={loginWithGoogle}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm"
              >
                <Chrome size={18} className="text-red-500 fill-current" />
                Continue with Google
              </button>

              <p className="text-center text-xs text-slate-500 pt-3">
                New customer?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="font-bold text-primary hover:text-primary-accent border-b border-primary/20 hover:border-primary transition-all"
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP VIEW */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">First Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Pamela"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Last Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="McLaughlin"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="pameladburell@yahoo.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    handleEmailCheckForGuestOrders(e.target.value);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
                />
              </div>

              {preCheckedOrdersCount > 0 && (
                <div className="p-3 bg-cta/10 border-l-4 border-cta rounded-lg text-xs text-secondary font-semibold flex items-center gap-2 animate-pulse mt-1">
                  <Sparkles size={16} />
                  <span>Success: We found {preCheckedOrdersCount} older guest order(s) awaiting to link instantly!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password strength progress meter */}
                <div className="mt-3 bg-slate-100 h-2 rounded-full overflow-hidden flex gap-1">
                  <div className={`h-full transition-all duration-300 ${strengthScore >= 1 ? 'bg-red-500' : 'bg-transparent'}`} style={{ width: '25%' }} />
                  <div className={`h-full transition-all duration-300 ${strengthScore >= 2 ? 'bg-orange-500' : 'bg-transparent'}`} style={{ width: '25%' }} />
                  <div className={`h-full transition-all duration-300 ${strengthScore >= 3 ? 'bg-yellow-500' : 'bg-transparent'}`} style={{ width: '25%' }} />
                  <div className={`h-full transition-all duration-300 ${strengthScore >= 4 ? 'bg-primary' : 'bg-transparent'}`} style={{ width: '25%' }} />
                </div>
                
                {/* Strength criteria list */}
                <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-bold tracking-wide uppercase text-slate-400">
                  <span className={`flex items-center gap-1 ${passwordStrength.length ? 'text-primary' : ''}`}>
                    <Check size={10} /> Min. 8 characters
                  </span>
                  <span className={`flex items-center gap-1 ${passwordStrength.number ? 'text-primary' : ''}`}>
                    <Check size={10} /> Contains digit
                  </span>
                  <span className={`flex items-center gap-1 ${passwordStrength.upper ? 'text-primary' : ''}`}>
                    <Check size={10} /> Capital letter
                  </span>
                  <span className={`flex items-center gap-1 ${passwordStrength.special ? 'text-primary' : ''}`}>
                    <Check size={10} /> Special symbol
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Verify Password</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 text-xs font-semibold text-slate-600 cursor-pointer leading-tight select-none">
                  <input 
                    type="checkbox"
                    required
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary/50 w-4 h-4 cursor-pointer mt-0.5"
                  />
                  <span>I agree to Samkhi Limited Terms of Service and Privacy Policy.</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 flex justify-center items-center gap-2 cursor-pointer mt-3 font-bold tracking-wide uppercase text-xs"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Create Account & Activate"}
              </button>

              <p className="text-center text-xs text-slate-500 pt-2">
                Already registered last order?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="font-bold text-secondary hover:text-primary border-b border-secondary/20 hover:border-primary transition-all"
                >
                  Sign in here
                </button>
              </p>
            </form>
          )}

          {/* PASSWORD RECOVERY VIEW */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your account verified email address below. We'll send a password recovery notification with a direct activation link. Links automatically expire in 1 hour.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="e.g. pamela@yahoo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 flex justify-center items-center gap-2 cursor-pointer font-bold tracking-wide uppercase text-xs"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Send Reset Link"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* PASSWORDLESS PORTAL VIEW */}
          {mode === 'magic' && (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect instantly without remembering letters or numbers patterns! Supply your checkout email below to receive a secure, one-shot magic activation click link.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Checkout Email</label>
                <input 
                  type="email"
                  required
                  placeholder="e.g. pamela@yahoo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-secondary py-3.5 flex justify-center items-center gap-2 cursor-pointer font-bold tracking-wide uppercase text-xs"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Request Magic Direct Link"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Return to normal login
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* Col 2: Guest Order Lookup Section (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Guest Search Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8 shrink-0">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-4 mb-4">
            <span className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Key size={18} />
            </span>
            <div>
              <h3 className="font-display font-bold text-lg text-secondary">Guest Tracker lookup</h3>
              <p className="text-xs text-slate-500">Find checkouts made without accounts</p>
            </div>
          </div>

          {guestError && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-xs text-semibold select-none flex items-center gap-2">
              <ShieldAlert size={14} />
              <span>{guestError}</span>
            </div>
          )}

          <form onSubmit={handleGuestTrackerSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Order Number</label>
              <input 
                type="text"
                required
                placeholder="e.g. #40441 or 10530W"
                value={guestOrderId}
                onChange={(e) => setGuestOrderId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-xs font-semibold uppercase tracking-wider transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Checkout Email</label>
              <input 
                type="email"
                required
                placeholder="pameladburell@yahoo.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 text-xs font-semibold transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={guestLoading}
              className="w-full bg-secondary hover:bg-secondary/90 transition-all text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 text-xs uppercase tracking-wider disabled:opacity-50 mt-1 cursor-pointer"
            >
              {guestLoading ? <Loader2 className="animate-spin" size={16} /> : "Track My Shipment"}
              <ArrowRight size={14} className="stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Informative Help Guide Card */}
        <div className="bg-gradient-to-br from-secondary to-slate-900 border border-slate-800 text-white p-6 md:p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <h4 className="font-display font-bold text-md text-cta flex items-center gap-1.5">
            <Sparkles size={16} /> Why register account?
          </h4>
          <ul className="mt-4 space-y-3.5 text-xs text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="p-1 bg-white/10 text-cta rounded-lg shrink-0 mt-0.5">⚡</span>
              <span><strong>Easy/Fast Checkouts:</strong> Register now to enjoy faster checkout with saved addresses next time.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="p-1 bg-white/10 text-cta rounded-lg shrink-0 mt-0.5">🚚</span>
              <span><strong>Unified Timeline:</strong> Skip hunting inbox matching links. Dashboard compiles shipping timelines automatically.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="p-1 bg-white/10 text-cta rounded-lg shrink-0 mt-0.5">🏡</span>
              <span><strong>Secure Vault:</strong> Speed checkouts with saved destination addresses and tokenized card preferences.</span>
            </li>
          </ul>
        </div>

      </div>

    </div>
  );
}
