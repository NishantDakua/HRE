import { Outlet, useMatch } from "react-router-dom";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import { TopNav } from "@/components/shell/TopNav";

/** Nav + page frame. The landing page is full-bleed with a transparent nav over the hero. */
export function AppShell() {
  const isLanding = useMatch({ path: "/", end: true }) !== null;
  return (
    <>
      <TopNav transparent={isLanding} />
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
      <ChatWidget />
    </>
  );
}
