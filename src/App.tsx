/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { DiscountProvider } from './context/DiscountContext';
import { ProductProvider } from './context/ProductContext';
import { InventoryProvider } from './context/InventoryContext';
import { CustomerProvider } from './context/CustomerContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import SolarSolutions from './pages/SolarSolutions';
import ProductDetail from './pages/ProductDetail';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import About from './pages/About';
import Contact from './pages/Contact';
import Commercial from './pages/Commercial';
import FAQ from './pages/FAQ';
import Support from './pages/Support';
import CookieConsent from './components/CookieConsent';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import AccountPage from './pages/AccountPage';
import { CustomerAuthProvider } from './context/CustomerAuthContext';

// Admin Imports
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminReports from './pages/admin/Reports';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminCustomers from './pages/admin/Customers';
import AdminCollections from './pages/admin/Collections';
import CollectionEditor from './pages/admin/CollectionEditor';
import AdminTags from './pages/admin/Tags';
import AdminDiscounts from './pages/admin/Discounts';
import DiscountDetail from './pages/admin/DiscountDetail';
import AdminSettings from './pages/admin/Settings';
import ProductEditor from './pages/admin/ProductEditor';
import OrderDetail from './pages/admin/OrderDetail';
import AdminInventory from './pages/admin/Inventory';
import AdminNotifications from './pages/admin/Notifications';
import AdminShipping from './pages/admin/Shipping';
import AdminInvoices from './pages/admin/Invoices';
import AdminMediaLibrary from './pages/admin/MediaLibrary';
import AdminLeads from './pages/admin/Leads';
import AdminReviews from './pages/admin/Reviews';
import AdminSuppliers from './pages/admin/Suppliers';
import AdminPurchaseOrders from './pages/admin/PurchaseOrders';
import AdminInstallations from './pages/admin/Installations';
import AdminWarranties from './pages/admin/Warranties';
import AdminFinancing from './pages/admin/Financing';
import AdminReturns from './pages/admin/Returns';
import AdminAbandonedCarts from './pages/admin/AbandonedCarts';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <AdminLayout>
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/new" element={<ProductEditor />} />
          <Route path="/admin/products/:id" element={<ProductEditor />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/orders/:id" element={<OrderDetail />} />
          <Route path="/admin/collections" element={<AdminCollections />} />
          <Route path="/admin/collections/tags" element={<AdminTags />} />
          <Route path="/admin/collections/new" element={<CollectionEditor />} />
          <Route path="/admin/collections/:id" element={<CollectionEditor />} />
          <Route path="/admin/inventory" element={<AdminInventory />} />
          <Route path="/admin/customers" element={<AdminCustomers />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/discounts" element={<AdminDiscounts />} />
          <Route path="/admin/discounts/:id" element={<DiscountDetail />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/shipping" element={<AdminShipping />} />
          <Route path="/admin/analytics" element={<AdminReports />} />
          <Route path="/admin/invoices" element={<AdminInvoices />} />
          <Route path="/admin/suppliers" element={<AdminSuppliers />} />
          <Route path="/admin/purchase-orders" element={<AdminPurchaseOrders />} />
          <Route path="/admin/installations" element={<AdminInstallations />} />
          <Route path="/admin/warranties" element={<AdminWarranties />} />
          <Route path="/admin/financing" element={<AdminFinancing />} />
          <Route path="/admin/returns" element={<AdminReturns />} />
          <Route path="/admin/abandoned-carts" element={<AdminAbandonedCarts />} />
          <Route path="/admin/media" element={<AdminMediaLibrary />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </AdminLayout>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/led-lighting" element={<Shop />} />
          <Route path="/solar" element={<SolarSolutions />} />
          <Route path="/solar-packages" element={<SolarSolutions />} />
          <Route path="/inverters-batteries" element={<Shop />} />
          <Route path="/water-heaters" element={<Shop />} />
          <Route path="/pool-pumps" element={<Shop />} />
          <Route path="/generators" element={<Shop />} />
          <Route path="/commercial" element={<Commercial />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/quote" element={<SolarSolutions />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/warranty" element={<Support />} />
          <Route path="/delivery" element={<Support />} />
          <Route path="/returns" element={<Support />} />
          <Route path="/privacy" element={<Support />} />
          <Route path="/terms" element={<Support />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      
      <a 
        href="https://wa.me/18766303350" 
        target="_blank" 
        rel="no-referrer"
        className="fixed bottom-8 right-8 z-[100] bg-green-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all animate-bounce"
      >
        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
      <CookieConsent />
    </div>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <CustomerAuthProvider>
        <ProductProvider>
          <InventoryProvider>
            <CartProvider>
              <OrderProvider>
                <DiscountProvider>
                  <CustomerProvider>
                    <BrowserRouter>
                      <ScrollToTop />
                      <ErrorBoundary>
                        <AppContent />
                      </ErrorBoundary>
                    </BrowserRouter>
                  </CustomerProvider>
                </DiscountProvider>
              </OrderProvider>
            </CartProvider>
          </InventoryProvider>
        </ProductProvider>
      </CustomerAuthProvider>
    </AdminAuthProvider>
  );
}

