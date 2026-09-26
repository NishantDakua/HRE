import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth";
import { AppShell } from "@/layouts/AppShell";
import { RootLayout } from "@/layouts/RootLayout";
import AnalyticsPage from "@/pages/Analytics";
import ContractPage from "@/pages/Contract";
import DashboardPage from "@/pages/Dashboard";
import HandoverPage from "@/pages/Handover";
import DiscoverPage from "@/pages/Discover";
import LandingPage from "@/pages/Landing";
import NotFoundPage from "@/pages/NotFound";
import RequestsPage from "@/pages/Requests";
import ResourceDetailPage from "@/pages/ResourceDetail";
import SignInPage from "@/pages/SignIn";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppShell />,
        errorElement: <NotFoundPage error />,
        children: [
          { index: true, element: <LandingPage /> },
          { path: "discover", element: <DiscoverPage /> },
          { path: "resource/:id", element: <ResourceDetailPage /> },
          { path: "sign-in/*", element: <SignInPage /> },
          {
            element: <ProtectedRoute />,
            children: [
              { path: "dashboard", element: <DashboardPage /> },
              { path: "requests", element: <RequestsPage /> },
              { path: "analytics", element: <AnalyticsPage /> },
              { path: "contract/:id", element: <ContractPage /> },
              { path: "handover/:id", element: <HandoverPage /> },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
