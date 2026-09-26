import { Outlet, useMatch } from "react-router-dom";
import { TopNav } from "@/components/shell/TopNav";
import { ChatWidget } from "@/components/chat/ChatWidget";

/** Nav + page frame. The landing page is full-bleed with a transparent nav over the hero. */
export function AppShell() {
  const isLanding = useMatch({ path: "/", end: true }) !== null;
  return (
    <>
      <TopNav transparent={isLanding} />
      <main>
        {isLanding ? (
          <Outlet />
        ) : (
          <div className="container px-4 py-6 sm:px-6 sm:py-8 md:py-14">
            <Outlet />
          </div>
        )}
      </main>
      <ChatWidget />
    </>
  );
}
