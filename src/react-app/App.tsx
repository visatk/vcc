import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import StoreFront from "./pages/StoreFront";
import AuthPage from "./pages/AuthPage";
import UserDashboard from "./pages/UserDashboard";
import AdminLayout from "./components/AdminLayout";
import ContactPage from "./pages/ContactPage";
import FaqPage from "./pages/FaqPage";
import LegalPage from "./pages/LegalPage";
import { useAuthStore } from "./store/authStore";
import CheckoutSuccess from './pages/CheckoutSuccess';
import TicketsManager from './pages/admin/TicketsManager';
import AbandonedCartsManager from './pages/admin/AbandonedCartsManager';
import SupportTickets from './pages/SupportTickets';

import AdminDashboard from "./components/AdminDashboard";
import ProductsManager from "./pages/admin/ProductsManager";
import OrdersManager from "./pages/admin/OrdersManager";
import CustomersManager from "./pages/admin/CustomersManager";
import CouponsManager from "./pages/admin/CouponsManager";
import CategoriesManager from "./pages/admin/CategoriesManager";
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import FraudManager from './pages/admin/FraudManager';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin } = useAuthStore(state => ({
    isAuthenticated: state.isAuthenticated(),
    isAdmin: state.isAdmin(),
  }));

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<StoreFront />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/terms" element={
          <LegalPage title="Terms of Use">
            <p>Welcome to our platform. By accessing or using our services, you agree to be bound by these terms.</p>
            <h3>1. Digital Products</h3>
            <p>All sales of digital products, including files, serial keys, and subscriptions, are final unless otherwise stated in our refund policy.</p>
            <h3>2. User Conduct</h3>
            <p>You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the Service without express written permission by us.</p>
          </LegalPage>
        } />
        <Route path="/privacy" element={
          <LegalPage title="Privacy Policy">
            <p>Your privacy is critically important to us.</p>
            <h3>1. Data Collection</h3>
            <p>We only collect the minimum amount of information necessary to fulfill your orders and maintain your account securely. This includes your email address.</p>
            <h3>2. Data Sharing</h3>
            <p>We do not sell or rent your personal information to third parties.</p>
          </LegalPage>
        } />
        <Route path="/crypto-policy" element={
          <LegalPage title="Crypto Payment Policy">
            <p>Our platform uses cryptocurrency for secure and borderless transactions.</p>
            <h3>1. Exchange Rates</h3>
            <p>Exchange rates are locked in at the time of checkout via ApiRone. You must send the exact amount requested.</p>
            <h3>2. Confirmations</h3>
            <p>Orders are automatically fulfilled upon receiving the required network confirmations (usually 1 confirmation for BTC and LTC).</p>
          </LegalPage>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        } />
        <Route path="/support" element={
          <ProtectedRoute>
            <SupportTickets />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<ProductsManager />} />
        <Route path="orders" element={<OrdersManager />} />
        <Route path="customers" element={<CustomersManager />} />
        <Route path="coupons" element={<CouponsManager />} />
        <Route path="categories" element={<CategoriesManager />} />
        <Route path="tickets" element={<TicketsManager />} />
        <Route path="carts" element={<AbandonedCartsManager />} />
        <Route path="fraud" element={<FraudManager />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
      </Route>
    </Routes>
  );
}
