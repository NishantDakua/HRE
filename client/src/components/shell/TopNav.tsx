import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { useAppStore } from "@/store/app";
import { useNotifications } from "@/hooks/queries";
import { NavAuth } from "@/components/auth";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/requests?new=1", label: "Post Need" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/requests", label: "Requests" },
  { href: "/analytics", label: "Analytics" },
];

const ROLES: { value: Role; label: string }[] = [
  { value: "seeker", label: "Seeker" },
  { value: "provider", label: "Provider" },
];

function Logo({ overHero }: { overHero: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Spare home">
      <span className="grid size-7 place-items-center rounded-[9px] border border-primary/40 bg-primary/10">
        <span className="font-display text-[15px] font-semibold leading-none text-primary">S</span>
      </span>
      <span className={cn("font-display text-xl tracking-tight md:hidden lg:inline", overHero ? "text-[color:rgb(var(--hero-fg))]" : "text-text")}>Spare</span>
    </Link>
  );
}

export function RoleSwitch() {
  const role = useAppStore((s) => s.mode);
  const setRole = useAppStore((s) => s.setMode);
  return (
    <div role="radiogroup" aria-label="Role" className="relative flex h-8 items-center rounded-full border border-border bg-surface p-0.5 touch:h-12">
      {ROLES.map((r) => {
        const active = role === r.value;
        return (
          <button
            key={r.value}
            role="radio"
            aria-checked={active}
            onClick={() => setRole(r.value)}
            className={cn(
              "relative z-10 h-full rounded-full px-3 text-xs font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted hover:text-text"
            )}
          >
            {active && (
              <motion.span
                layoutId="role-pill"
                className="absolute inset-0 -z-10 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <button
      aria-label={`Notifications, ${unread} unread`}
      className="relative grid size-9 place-items-center rounded-full border border-border text-muted transition-colors hover:border-primary/40 hover:text-text touch:size-11"
    >
      <Bell className="size-4" strokeWidth={1.75} />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-conflict px-1 font-mono text-[10px] font-medium tabular-nums text-bg">
          {unread}
        </span>
      )}
    </button>
  );
}

function useNavActive() {
  const { pathname, search } = useLocation();
  return (href: string) => {
    const [path, query] = href.split("?");
    if (query) return pathname === path && search.includes(query);
    return (pathname === path || pathname.startsWith(`${path}/`)) && !search.includes("new=1");
  };
}

/** True once the landing hero ([data-hero]) has scrolled up under the nav. */
function usePastHero(enabled: boolean) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const hero = document.querySelector("[data-hero]");
      setPast(hero ? hero.getBoundingClientRect().bottom <= 64 : window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled]);
  return enabled && past;
}

export function TopNav({ transparent = false }: { transparent?: boolean }) {
  const isActive = useNavActive();
  const solid = usePastHero(transparent);
  const clear = transparent && !solid;

  return (
    <header
      className={cn(
        "top-0 z-40 border-b print:hidden transition-[background-color,border-color,backdrop-filter] duration-300",
        transparent ? "fixed inset-x-0" : "sticky",
        clear ? "border-transparent bg-transparent" : "border-border bg-bg/85 backdrop-blur-md"
      )}
    >
      <div className="container flex h-16 items-center gap-8 md:gap-3 lg:gap-8">
        <Logo overHero={clear} />

        <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex md:gap-0 lg:gap-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "relative whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors md:px-2 lg:px-3",
                  clear
                    ? active
                      ? "text-[color:rgb(var(--hero-fg))]"
                      : "text-[color:rgb(var(--hero-fg)/0.65)] hover:text-[color:rgb(var(--hero-fg))]"
                    : active
                      ? "text-text"
                      : "text-muted hover:text-text"
                )}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-3 -bottom-[13px] h-px bg-primary md:inset-x-2 lg:inset-x-3"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 md:gap-2 lg:gap-3">
          <div className="hidden md:block">
            <RoleSwitch />
          </div>
          <NotificationBell />
          <NavAuth />
        </div>
      </div>
    </header>
  );
}
