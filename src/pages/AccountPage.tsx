import { useState, useEffect } from 'react';
import { CustomerAuthProvider, useCustomerAuth } from '../context/CustomerAuthContext';
import AuthContainer from '../components/account/AuthContainer';
import CustomerDashboard from '../components/account/CustomerDashboard';
import OrderDetailView from '../components/account/OrderDetailView';
import { Order } from '../types';
import { Search, Loader2, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

function AccountPageContent() {
  const { customerUser, loading } = useCustomerAuth();
  const [guestOrder, setGuestOrder] = useState<Order | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Parse redirect state or wishlist query args
  const queryParams = new URLSearchParams(location.search);
  const wishlistProductRedirect = queryParams.get('wishlist_add_redirect');

  // Handle back from guest details lookup
  const handleBackFromGuest = () => {
    setGuestOrder(null);
  };

  const handleLoginSuccess = () => {
    // Scroll smoothly to dashboard
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWishlistItemView = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-slate-50 font-sans">
        <Loader2 className="w-10 h-10 border-4 text-primary animate-spin" />
        <span className="text-xs text-slate-500 font-bold mt-4">Connecting to Samkhi Account Vault...</span>
      </div>
    );
  }

  // Not signed-in view
  if (!customerUser) {
    if (guestOrder) {
      return (
        <div className="bg-white min-h-[600px] py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="mb-6 p-4 bg-cta/15 text-secondary border border-cta/20 rounded-2xl flex justify-between items-center flex-wrap gap-4 font-sans">
              <div>
                <h3 className="font-display font-black text-xs uppercase tracking-widest text-cta-dark">Guest Tracker Session</h3>
                <p className="text-xs mt-1">Viewing order #{guestOrder.id} matches. Register for active tracking alerts.</p>
              </div>
              <button 
                onClick={handleBackFromGuest} 
                className="bg-secondary hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} /> Exit Guest Mode
              </button>
            </div>
            
            <OrderDetailView order={guestOrder} onBack={handleBackFromGuest} />
          </div>
        </div>
      );
    }

    return (
      <div className="bg-slate-50/50 min-h-[650px] py-6 sm:py-12">
        <AuthContainer 
          onGuestLookup={(order) => setGuestOrder(order)} 
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // Signed-in Dashboard view
  return (
    <div className="bg-white min-h-[700px] py-6 sm:py-12">
      <CustomerDashboard 
        onLogoutSuccess={() => setGuestOrder(null)}
        initialProductIdForWishlistRedirect={wishlistProductRedirect}
        onViewProductLanding={handleWishlistItemView}
      />
    </div>
  );
}

export default function AccountPage() {
  return (
    <AccountPageContent />
  );
}
