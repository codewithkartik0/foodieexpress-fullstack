import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, ListOrdered, UtensilsCrossed, Settings, Building2, ShieldAlert } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { CustomerLayout } from './components/CustomerLayout';
import { AdminLayout, AdminNavItem } from './components/AdminLayout';

// Customer pages
const HomePage = lazy(() => import('./pages/customer/HomePage'));
const RestaurantsListPage = lazy(() => import('./pages/customer/RestaurantsListPage'));
const RestaurantDetailPage = lazy(() => import('./pages/customer/RestaurantDetailPage'));
const CartPage = lazy(() => import('./pages/customer/CartPage'));
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/customer/LoginPage'));
const RegisterPage = lazy(() => import('./pages/customer/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/customer/VerifyEmailPage'));
const MyOrdersPage = lazy(() => import('./pages/customer/MyOrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/customer/OrderDetailPage'));
const ProfilePage = lazy(() => import('./pages/customer/ProfilePage'));
import { ForgotPasswordPage, ResetPasswordPage } from './pages/customer/PasswordPages';

// Restaurant admin pages
const RestaurantDashboardPage = lazy(() => import('./pages/restaurant/DashboardPage'));
const RestaurantOrdersPage = lazy(() => import('./pages/restaurant/OrdersPage'));
const RestaurantOrderDetailPage = lazy(() => import('./pages/restaurant/OrderDetailPage'));
const RestaurantMenuPage = lazy(() => import('./pages/restaurant/MenuPage'));
const RestaurantSettingsPage = lazy(() => import('./pages/restaurant/SettingsPage'));

// Platform admin pages
const PlatformDashboardPage = lazy(() => import('./pages/platform/DashboardPage'));
const PlatformRestaurantsPage = lazy(() => import('./pages/platform/RestaurantsPage'));
const PlatformAuditLogsPage = lazy(() => import('./pages/platform/AuditLogsPage'));

const restaurantNav: AdminNavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/admin/orders', label: 'Orders', icon: <ListOrdered size={18} /> },
  { to: '/admin/menu', label: 'Menu', icon: <UtensilsCrossed size={18} /> },
  { to: '/admin/restaurant', label: 'Restaurant', icon: <Settings size={18} /> },
];

const platformNav: AdminNavItem[] = [
  { to: '/platform', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/platform/restaurants', label: 'Restaurants', icon: <Building2 size={18} /> },
  { to: '/platform/audit-logs', label: 'Audit logs', icon: <ShieldAlert size={18} /> },
];

function Loading() {
  return <div className="flex h-screen items-center justify-center text-ink-500">Loading...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Customer surface */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/restaurants" element={<RestaurantsListPage />} />
                <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute roles={['customer']}>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute roles={['customer']}>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute roles={['customer']}>
                      <MyOrdersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <ProtectedRoute roles={['customer']}>
                      <OrderDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
              </Route>

              {/* Standalone auth pages */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

              {/* Restaurant admin */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['restaurant']}>
                    <AdminLayout navItems={restaurantNav} title="Restaurant panel" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<RestaurantDashboardPage />} />
                <Route path="orders" element={<RestaurantOrdersPage />} />
                <Route path="orders/:id" element={<RestaurantOrderDetailPage />} />
                <Route path="menu" element={<RestaurantMenuPage />} />
                <Route path="restaurant" element={<RestaurantSettingsPage />} />
              </Route>

              {/* Platform admin */}
              <Route
                path="/platform"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminLayout navItems={platformNav} title="Platform admin" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<PlatformDashboardPage />} />
                <Route path="restaurants" element={<PlatformRestaurantsPage />} />
                <Route path="audit-logs" element={<PlatformAuditLogsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function UnauthorizedPage() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="mt-2 text-ink-500">Your account does not have permission to view this page.</p>
    </div>
  );
}
