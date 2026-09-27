import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Home, Inbox, LayoutDashboard, LogIn, MoreHorizontal, PlusCircle, Search, X, type LucideIcon } from "lucide-react";
import { AUTH_ENABLED } from "@/components/auth";
import { SignedOut } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";
import { RoleSwitch } from "./TopNav";

const TABS: { href: string; label: string; icon: LucideIcon; match: (path: string, search: string) => boolean }[] = [
  { href: "/discover", label: "Discover", icon: Search, match: (p) => p === "/discover" || p.startsWith("/resource/") },
  {
    href: "/requests",
    label: "Requests",
    icon: Inbox,
    match: (p, s) => (p === "/requests" && !s.includes("new=1")) || p.startsWith("/contract/") || p.startsWith("/handover/") || p.startsWith("/labels/"),
  },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, match: (p) => p === "/analytics" },
];

function MoreLink({ to, icon: Icon, children, onClick }: { to: string; icon: LucideIcon; children: ReactNode; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] text-text hover:bg-sand/60">
      <Icon className="size-5 text-muted" strokeWidth={1.75} />
      {children}
    </Link>
  );
}

/** Phones: primary navigation as a fixed bottom tab bar, plus a More sheet. */
export function BottomTabBar() {
  const { pathname, search } = useLocation();
  const [more, setMore] = useState(false);

  useEffect(() => setMore(false), [pathname, search]);
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [more]);

  const moreActive = more || (pathname === "/requests" && search.includes("new=1"));

  return (
    <>
      <AnimatePresence>
        {more && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-ink/30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMore(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="More"
              className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-border bg-card px-4 pb-tabbar pt-3 shadow-card md:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" aria-hidden />
              <div className="flex items-center justify-between pb-2">
                <p className="eyebrow">More</p>
                <button type="button" onClick={() => setMore(false)} aria-label="Close" className="grid size-11 place-items-center rounded-full text-muted hover:bg-sand/60">
                  <X className="size-5" />
                </button>
              </div>
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2">
                <span className="text-sm text-muted">View as</span>
                <RoleSwitch />
              </div>
              <nav className="grid gap-0.5" aria-label="More">
                <MoreLink to="/requests?new=1" icon={PlusCircle} onClick={() => setMore(false)}>
                  Post a need
                </MoreLink>
                <MoreLink to="/" icon={Home} onClick={() => setMore(false)}>
                  Home
                </MoreLink>
                {AUTH_ENABLED && (
                  <SignedOut>
                    <MoreLink to="/sign-in" icon={LogIn} onClick={() => setMore(false)}>
                      Sign in
                    </MoreLink>
                  </SignedOut>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg/95 pb-safe backdrop-blur-md print:hidden md:hidden"
      >
        <ul className="grid h-[4.25rem] grid-cols-5">
          {TABS.map(({ href, label, icon: Icon, match }) => {
            const active = !more && match(pathname, search);
            return (
              <li key={href} className="contents">
                <Link
                  to={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-primary" : "text-muted")}
                >
                  {active && <motion.span layoutId="tab-active" className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                  <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="contents">
            <button
              type="button"
              aria-expanded={more}
              aria-haspopup="dialog"
              onClick={() => setMore((open) => !open)}
              className={cn("relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", moreActive ? "text-primary" : "text-muted")}
            >
              {moreActive && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" />}
              <MoreHorizontal className="size-[22px]" strokeWidth={moreActive ? 2.25 : 1.75} />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
