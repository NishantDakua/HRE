import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/components/auth";
import { RouteChangeHandler } from "@/components/RouteChangeHandler";
import { SmoothScroll } from "@/components/smooth-scroll";

/** Providers that need the router (Clerk navigation). Lenis is a single global instance here. */
export function RootLayout() {
  return (
    <AuthProvider>
      <SmoothScroll>
        <RouteChangeHandler />
        <Outlet />
      </SmoothScroll>
      <div className="paper-grain" aria-hidden />
    </AuthProvider>
  );
}
