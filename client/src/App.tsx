import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuth, useUser } from '@clerk/react';
import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout';
import ProviderLayout from './layouts/ProviderLayout';
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

// Authenticated buyer pages
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
import MyResourcesPage from './pages/auth/MyResourcesPage';
import AddResourcePage from './pages/auth/AddResourcePage';
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

function ProviderRoute({ children }: { children: React.ReactNode }) {
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

          {/* Authenticated buyer routes */}
          <Route
            element={
              <ProtectedRoute>
                <AuthLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/requirements" element={<RequirementsPage />} />
            <Route path="/requirements/new" element={<PostRequirementPage />} />
            <Route path="/requirements/:id" element={<RequirementDetailPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/negotiations" element={<NegotiationsPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/bookings/:id" element={<BookingDetailPage />} />
            <Route path="/fulfillment" element={<FulfillmentPage />} />
            <Route path="/resources/my" element={<MyResourcesPage />} />
            <Route path="/resources/new" element={<AddResourcePage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/business" element={<BusinessProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Provider routes */}
          <Route
            element={
              <ProviderRoute>
                <ProviderLayout />
              </ProviderRoute>
            }
          >
            <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
            <Route path="/provider/resources" element={<ProviderResourcesPage />} />
            <Route path="/provider/requests" element={<ProviderRequestsPage />} />
            <Route path="/provider/negotiations" element={<ProviderNegotiationsPage />} />
            <Route path="/provider/bookings" element={<ProviderBookingsPage />} />
            <Route path="/provider/fulfillment" element={<ProviderFulfillmentPage />} />
            <Route path="/provider/payments" element={<ProviderPaymentsPage />} />
            <Route path="/provider/analytics" element={<ProviderAnalyticsPage />} />
            <Route path="/provider/business" element={<ProviderBusinessPage />} />
            <Route path="/provider/settings" element={<ProviderSettingsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
