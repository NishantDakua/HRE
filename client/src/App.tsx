import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuth, useUser } from '@clerk/react';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import OnboardingPage from './pages/public/OnboardingPage';

// Public pages
import HomePage from './pages/public/HomePage';
import MarketplacePage from './pages/public/MarketplacePage';
import ResourceDetailPage from './pages/public/ResourceDetailPage';
import ProvidersPage from './pages/public/ProvidersPage';
import ProviderProfilePage from './pages/public/ProviderProfilePage';
import HowItWorksPage from './pages/public/HowItWorksPage';
import FinancingPage from './pages/public/FinancingPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import FAQPage from './pages/public/FAQPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import VerifyBusinessPage from './pages/public/VerifyBusinessPage';

// Dashboard pages (Buyer & Seller)
import DashboardPage from './pages/auth/DashboardPage';
import DiscoverPage from './pages/auth/DiscoverPage';
import PostRequirementPage from './pages/auth/PostRequirementPage';
import RequirementsPage from './pages/auth/RequirementsPage';
import RequirementDetailPage from './pages/auth/RequirementDetailPage';
import MatchesPage from './pages/auth/MatchesPage';
import NegotiationsPage from './pages/auth/NegotiationsPage';
import BookingsPage from './pages/auth/BookingsPage';
import BookingDetailPage from './pages/auth/BookingDetailPage';
import FulfillmentPage from './pages/auth/FulfillmentPage';
import PaymentsPage from './pages/auth/PaymentsPage';
import NotificationsPage from './pages/auth/NotificationsPage';
import MessagesPage from './pages/auth/MessagesPage';
import AnalyticsPage from './pages/auth/AnalyticsPage';
import SettingsPage from './pages/auth/SettingsPage';
import BusinessProfilePage from './pages/auth/BusinessProfilePage';

// Provider pages
import ProviderDashboardPage from './pages/provider/ProviderDashboardPage';
import ProviderResourcesPage from './pages/provider/ProviderResourcesPage';
import ProviderRequestsPage from './pages/provider/ProviderRequestsPage';
import ProviderNegotiationsPage from './pages/provider/ProviderNegotiationsPage';
import ProviderBookingsPage from './pages/provider/ProviderBookingsPage';
import ProviderFulfillmentPage from './pages/provider/ProviderFulfillmentPage';
import ProviderPaymentsPage from './pages/provider/ProviderPaymentsPage';
import ProviderAnalyticsPage from './pages/provider/ProviderAnalyticsPage';
import ProviderBusinessPage from './pages/provider/ProviderBusinessPage';
import ProviderSettingsPage from './pages/provider/ProviderSettingsPage';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/:id" element={<ResourceDetailPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/providers/:id" element={<ProviderProfilePage />} />
            <Route path="/financing" element={<FinancingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
          </Route>

          {/* Auth routes (no layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/verify-business" element={<VerifyBusinessPage />} />

          {/* Unified Dashboard Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Buyer Routes */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/discover" element={<DiscoverPage />} />
            <Route path="/dashboard/requirements" element={<RequirementsPage />} />
            <Route path="/dashboard/requirements/new" element={<PostRequirementPage />} />
            <Route path="/dashboard/requirements/:id" element={<RequirementDetailPage />} />
            <Route path="/dashboard/matches" element={<MatchesPage />} />
            <Route path="/dashboard/negotiations" element={<NegotiationsPage />} />
            <Route path="/dashboard/bookings" element={<BookingsPage />} />
            <Route path="/dashboard/bookings/:id" element={<BookingDetailPage />} />
            <Route path="/dashboard/fulfillment" element={<FulfillmentPage />} />
            <Route path="/dashboard/payments" element={<PaymentsPage />} />
            <Route path="/dashboard/notifications" element={<NotificationsPage />} />
            <Route path="/dashboard/messages" element={<MessagesPage />} />
            <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
            <Route path="/dashboard/business" element={<BusinessProfilePage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />

            {/* Seller Routes */}
            <Route path="/dashboard/seller" element={<ProviderDashboardPage />} />
            <Route path="/dashboard/seller/resources" element={<ProviderResourcesPage />} />
            <Route path="/dashboard/seller/orders" element={<ProviderRequestsPage />} />
            <Route path="/dashboard/seller/negotiations" element={<ProviderNegotiationsPage />} />
            <Route path="/dashboard/seller/fulfillment" element={<ProviderFulfillmentPage />} />
            <Route path="/dashboard/seller/payments" element={<ProviderPaymentsPage />} />
            <Route path="/dashboard/seller/analytics" element={<ProviderAnalyticsPage />} />
            <Route path="/dashboard/seller/business" element={<ProviderBusinessPage />} />
            <Route path="/dashboard/seller/settings" element={<ProviderSettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
