import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from '@/hooks/useAuth';
import { PricingProvider } from '@/hooks/usePricing';
import { CartProvider } from '@/hooks/useCartDB';
import { useSessionEnforcement } from '@/hooks/useSessionEnforcement';
import ScrollToTop from './components/ScrollToTop';
import WhatsAppButton from './components/WhatsAppButton';

import Home from './pages/Home';
import About from './pages/About';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Catalog from './pages/Catalog';
import NewArrivals from './pages/NewArrivals';
import ProductDetails from './pages/ProductDetails';
import Profile from './pages/Profile';
import FindShops from './pages/FindShops';
import PremiumPartner from './pages/PremiumPartner';
import MyOrders from './pages/MyOrders';
import MyInsights from './pages/MyInsights';
import MyVouchers from './pages/MyVouchers';
import Cart from './pages/Cart';
import PaymentGateway from './pages/PaymentGateway';
import NotFound from "./pages/NotFound";
import Register from './pages/Register';
import MerchantRegister from './pages/MerchantRegister';
import MerchantConsole from './pages/MerchantConsole';
import ShopDetails from './pages/ShopDetails';
import UserSettings from './pages/Settings';

// Admin Components
import AdminLayout from './components/admin/AdminLayout';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';
import SetAdminPassword from './pages/SetAdminPassword';
import Dashboard from './pages/admin/Dashboard';
import ComponentLibraryPro from './pages/admin/ComponentLibraryPro';
import ProductsPro from './pages/admin/ProductsPro';
import Orders from './pages/admin/Orders';
import ArchivedOrders from './pages/admin/ArchivedOrders';
import Customers from './pages/admin/Customers';
import SiteSettings from './pages/admin/SiteSettings';
import UserManagement from './pages/admin/UserManagement';
import WarehouseOperations from './pages/admin/WarehouseOperations';
import InventoryAlerts from './pages/admin/InventoryAlerts';
import VoucherManagement from './pages/admin/VoucherManagement';
import ReviewModeration from './pages/admin/ReviewModeration';
import CustomerTiers from './pages/admin/CustomerTiers';
import AuditLog from './pages/admin/AuditLog';
import Vendors from './pages/admin/Vendors';
import AdminVendorPayouts from './pages/admin/VendorPayouts';
import AdminVendorFulfilments from './pages/admin/VendorFulfilments';
import VendorLayout from './components/vendor/VendorLayout';
import ProtectedVendorRoute from './components/vendor/ProtectedVendorRoute';
import VendorRedirector from './components/vendor/VendorRedirector';
import VendorDashboard from './pages/vendor/Dashboard';
import VendorProducts from './pages/vendor/Products';
import VendorComponents from './pages/vendor/Components';
import VendorOrders from './pages/vendor/Orders';
import VendorPayouts from './pages/vendor/Payouts';
import VendorSettings from './pages/vendor/Settings';
import SecondhandModeration from './pages/admin/SecondhandModeration';
import Analytics from './pages/admin/Analytics';
import BulkImport from '@/pages/admin/BulkImport';

// New Phase 2 Pages
import SecondhandMarketplace from './pages/SecondhandMarketplace';
import My2ndHandListings from './pages/My2ndHandListings';
import NotificationSettings from './pages/NotificationSettings';
import PointsRewards from './pages/admin/PointsRewards';
import Salesmen from './pages/admin/Salesmen';

// Returns Pages
import ReturnRequest from './pages/ReturnRequest';
import MyReturns from './pages/MyReturns';
import ReturnPolicy from './pages/ReturnPolicy';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import AdminReturns from './pages/admin/Returns';

// Warehouse Pages
import WarehouseDashboard from './pages/warehouse/Dashboard';
import WarehouseScan from './pages/warehouse/Scan';

const queryClient = new QueryClient();

function SessionEnforcer() {
  useSessionEnforcement();
  return null;
}

function CustomerWhatsApp() {
  const { pathname } = useLocation();
  // Hide on admin, warehouse and vendor pages — those audiences don't
  // need the customer contact surface.
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/warehouse') ||
    pathname.startsWith('/vendor')
  ) return null;
  return <WhatsAppButton />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <SessionEnforcer />
          <PricingProvider>
            <CartProvider>
              <BrowserRouter>
                <ScrollToTop />
                <VendorRedirector />
                <CustomerWhatsApp />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/new-arrivals" element={<NewArrivals />} />
                  <Route path="/product/:id" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/my-orders" element={<MyOrders />} />
                  <Route path="/my-insights" element={<MyInsights />} />
                  <Route path="/my-vouchers" element={<MyVouchers />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<UserSettings />} />
                  <Route path="/payment-gateway" element={<PaymentGateway />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/admin-login" element={<Navigate to="/admin" replace />} />
                  {/* Invited admins set their own password here (recovery link target) */}
                  <Route path="/admin/set-password" element={<SetAdminPassword />} />
                  <Route path="/merchant-register" element={<MerchantRegister />} />
                  <Route path="/premium-partner" element={<PremiumPartner />} />
                  <Route path="/merchant/dashboard" element={<MerchantConsole />} />
                  <Route path="/merchant-console" element={<MerchantConsole />} />
                  <Route path="/find-shops" element={<FindShops />} />
                  <Route path="/shop/:shopId" element={<ShopDetails />} />

                  {/* Phase 2 - New Routes */}
                  <Route path="/secondhand-marketplace" element={<SecondhandMarketplace />} />
                  <Route path="/my-2ndhand-listings" element={<My2ndHandListings />} />
                  <Route path="/notification-settings" element={<NotificationSettings />} />
                  {/* Returns Routes */}
                  <Route path="/return-request" element={<ReturnRequest />} />
                  <Route path="/my-returns" element={<MyReturns />} />
                  <Route path="/return-policy" element={<ReturnPolicy />} />

                  {/* Legal */}
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />

                  {/* Warehouse Routes (Protected) */}
                  <Route path="/warehouse/dashboard" element={
                    <ProtectedAdminRoute>
                      <WarehouseDashboard />
                    </ProtectedAdminRoute>
                  } />
                  <Route path="/warehouse/scan" element={
                    <ProtectedAdminRoute>
                      <WarehouseScan />
                    </ProtectedAdminRoute>
                  } />

                  {/* Admin Routes */}
                  <Route path="/admin/*" element={
                    <ProtectedAdminRoute>
                      <AdminLayout />
                    </ProtectedAdminRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="products" element={<ProductsPro />} />
                    <Route path="component-library" element={<ComponentLibraryPro />} />
                    <Route path="bulk-import" element={<BulkImport />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="archived-orders" element={<ArchivedOrders />} />
                    <Route path="warehouse-operations" element={<WarehouseOperations />} />
                    <Route path="inventory-alerts" element={<InventoryAlerts />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="vendors" element={<Vendors />} />
                    <Route path="vendor-payouts" element={<AdminVendorPayouts />} />
                    <Route path="vendor-fulfilments" element={<AdminVendorFulfilments />} />
                    <Route path="review-moderation" element={<ReviewModeration />} />
                    <Route path="vouchers" element={<VoucherManagement />} />
                    <Route path="customer-tiers" element={<CustomerTiers />} />
                    <Route path="audit-log" element={<AuditLog />} />
                    <Route path="points-rewards" element={<PointsRewards />} />
                    <Route path="secondhand-moderation" element={<SecondhandModeration />} />
                    <Route path="salesmen" element={<Salesmen />} />
                    <Route path="returns" element={<AdminReturns />} />
                    <Route path="users" element={<UserManagement />} />
                    {/* Categories page removed — categories are created inline from the product form. Redirect old links. */}
                    <Route path="categories" element={<Navigate to="/admin/products" replace />} />
                    {/* Was the catch-all "Settings" page; kept so old links still land somewhere. */}
                    <Route path="settings" element={<Navigate to="/admin/site-settings" replace />} />
                    <Route path="site-settings" element={<SiteSettings />} />
                  </Route>

                  {/* Vendor protected console — partner accounts are admin-issued */}
                  <Route path="/vendor/login" element={<Navigate to="/auth?tab=partner" replace />} />
                  <Route path="/vendor/apply" element={<Navigate to="/auth?tab=partner" replace />} />
                  <Route
                    path="/vendor"
                    element={
                      <ProtectedVendorRoute>
                        <VendorLayout />
                      </ProtectedVendorRoute>
                    }
                  >
                    <Route index element={<VendorDashboard />} />
                    <Route path="dashboard" element={<VendorDashboard />} />
                    <Route path="products" element={<VendorProducts />} />
                    <Route path="components" element={<VendorComponents />} />
                    <Route path="orders" element={<VendorOrders />} />
                    <Route path="payouts" element={<VendorPayouts />} />
                    <Route path="settings" element={<VendorSettings />} />
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
