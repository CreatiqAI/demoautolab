import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from '@/hooks/useAuth';
import { PricingProvider } from '@/hooks/usePricing';
import { CartProvider } from '@/hooks/useCartDB';
import ScrollToTop from './components/ScrollToTop';

import Home from './pages/Home';
import About from './pages/About';
import Auth from './pages/Auth';
import Catalog from './pages/Catalog';
import ProductDetails from './pages/ProductDetails';
import Profile from './pages/Profile';
import FindShops from './pages/FindShops';
import PremiumPartner from './pages/PremiumPartner';
import MyOrders from './pages/MyOrders';
import MyVouchers from './pages/MyVouchers';
import Cart from './pages/Cart';
import PaymentGateway from './pages/PaymentGateway';
import NotFound from "./pages/NotFound";
import AdminRegister from './pages/AdminRegister';
import MerchantRegister from './pages/MerchantRegister';
import MerchantConsole from './pages/MerchantConsole';
import ShopDetails from './pages/ShopDetails';
import CreateAdmin from './pages/CreateAdmin';
import CreateFirstAdmin from './pages/CreateFirstAdmin';
import DirectAdminSetup from './pages/DirectAdminSetup';

// Admin Components
import AdminLayout from './components/admin/AdminLayout';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import ProductsAdvanced from './pages/admin/ProductsAdvanced';
import ComponentLibraryPro from './pages/admin/ComponentLibraryPro';
import ProductsPro from './pages/admin/ProductsPro';
import Orders from './pages/admin/Orders';
import ArchivedOrders from './pages/admin/ArchivedOrders';
import Customers from './pages/admin/Customers';
import Settings from './pages/admin/Settings';
import UserManagement from './pages/admin/UserManagement';
import OrderVerification from './pages/admin/OrderVerification';
import WarehouseOperations from './pages/admin/WarehouseOperations';
import KnowledgeBase from './pages/admin/KnowledgeBase';
import InventoryAlerts from './pages/admin/InventoryAlerts';
import VoucherManagement from './pages/admin/VoucherManagement';
import ReviewModeration from './pages/admin/ReviewModeration';
import ReviewsDebug from './pages/admin/ReviewsDebug';
import DebugShops from './pages/admin/DebugShops';
import PremiumPartners from './pages/admin/PremiumPartners';
import CustomerTiers from './pages/admin/CustomerTiers';
import InstallationGuides from './pages/admin/InstallationGuides';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <PricingProvider>
            <CartProvider>
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/product/:id" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/my-orders" element={<MyOrders />} />
                  <Route path="/my-vouchers" element={<MyVouchers />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/payment-gateway" element={<PaymentGateway />} />
                  <Route path="/admin-register" element={<AdminRegister />} />
                  <Route path="/merchant-register" element={<MerchantRegister />} />
                  <Route path="/premium-partner" element={<PremiumPartner />} />
                  <Route path="/merchant/dashboard" element={<MerchantConsole />} />
                  <Route path="/find-shops" element={<FindShops />} />
                  <Route path="/shop/:shopId" element={<ShopDetails />} />
                  <Route path="/create-admin" element={<CreateAdmin />} />
                  <Route path="/create-first-admin" element={<CreateFirstAdmin />} />
                  <Route path="/direct-admin-setup" element={<DirectAdminSetup />} />

                  {/* Admin Routes */}
                  <Route path="/admin/*" element={
                    <ProtectedAdminRoute>
                      <AdminLayout />
                    </ProtectedAdminRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="products" element={<Products />} />
                    <Route path="products-advanced" element={<ProductsAdvanced />} />
                    <Route path="products-enhanced" element={<ProductsPro />} />
                    <Route path="component-library" element={<ComponentLibraryPro />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="archived-orders" element={<ArchivedOrders />} />
                    <Route path="order-verification" element={<OrderVerification />} />
                    <Route path="warehouse-operations" element={<WarehouseOperations />} />
                    <Route path="inventory-alerts" element={<InventoryAlerts />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="review-moderation" element={<ReviewModeration />} />
                    <Route path="reviews-debug" element={<ReviewsDebug />} />
                    <Route path="debug-shops" element={<DebugShops />} />
                    <Route path="vouchers" element={<VoucherManagement />} />
                    <Route path="premium-partners" element={<PremiumPartners />} />
                    <Route path="customer-tiers" element={<CustomerTiers />} />
                    <Route path="installation-guides" element={<InstallationGuides />} />
                    <Route path="knowledge-base" element={<KnowledgeBase />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </CartProvider>
          </PricingProvider>
        </AuthProvider>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
