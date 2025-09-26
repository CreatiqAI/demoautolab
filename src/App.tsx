import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCartDB";
import { PricingProvider } from "@/hooks/usePricing";
import Home from './pages/Home';
import Auth from './pages/Auth';
import Catalog from './pages/Catalog';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import MyOrders from './pages/MyOrders';
import PaymentGateway from './pages/PaymentGateway';
import NotFound from "./pages/NotFound";
import CreateAdmin from './pages/CreateAdmin';
import CreateFirstAdmin from './pages/CreateFirstAdmin';
import DirectAdminSetup from './pages/DirectAdminSetup';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import ProductsAdvanced from './pages/admin/ProductsAdvanced';
import ProductsEnhanced from './pages/admin/ProductsEnhanced';
import ProductsEnhancedV2 from './pages/admin/ProductsEnhancedV2';
import ComponentLibrary from './pages/admin/ComponentLibrary';
import ComponentLibraryPro from './pages/admin/ComponentLibraryPro';
import ProductsPro from './pages/admin/ProductsPro';
import Orders from './pages/admin/Orders';
import ArchivedOrders from './pages/admin/ArchivedOrders';
import Customers from './pages/admin/CustomersNew';
import Settings from './pages/admin/Settings';
import UserManagement from './pages/admin/UserManagement';
import OrderVerification from './pages/admin/OrderVerification';
import RouteManagement from './pages/admin/RouteManagement';
import WarehouseOperations from './pages/admin/WarehouseOperations';
import KnowledgeBase from './pages/admin/KnowledgeBase';
import InventoryAlerts from './pages/admin/InventoryAlerts';
import AdminRegister from './pages/AdminRegister';
import ScrollToTop from './components/ScrollToTop';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <AuthProvider>
        <PricingProvider>
          <CartProvider>
            <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/payment-gateway" element={<PaymentGateway />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin-register" element={<AdminRegister />} />
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
              <Route path="route-management" element={<RouteManagement />} />
              <Route path="warehouse-operations" element={<WarehouseOperations />} />
              <Route path="inventory-alerts" element={<InventoryAlerts />} />
              <Route path="customers" element={<Customers />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </PricingProvider>
      </AuthProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
