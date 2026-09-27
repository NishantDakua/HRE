import { Outlet, useMatch } from "react-router-dom";
import { TopNav } from "@/components/shell/TopNav";
import { ApiStatusDot } from "@/components/ApiStatusDot";
import { BottomTabBar } from "@/components/shell/BottomTabBar";

/** Nav + page frame. The landing page is full-bleed with a transparent nav over the hero. */
export function AppShell() {
  const isLanding = useMatch({ path: "/", end: true }) !== null;
  return (
    <>
      <TopNav transparent={isLanding} />
      {/* Phones: room below the content for the fixed tab bar. */}
      <main className="pb-tabbar md:pb-0">
        {isLanding ? (
          <Outlet />
        ) : (
          <div className="container py-10 md:py-14">
            <Outlet />
          </div>
        )}
      </main>
      <BottomTabBar />
      <ApiStatusDot />
    </>
  );
}
