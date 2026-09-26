import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "@/components/smooth-scroll";

/**
 * On every route change: re-measure ScrollTriggers, then jump to the top.
 * Hash links are left to the page.
 *
 * Order matters: refresh() restores ScrollTrigger's cached scroll position (the old
 * page's), so the reset has to come after it — through Lenis when active so its
 * internal position stays in sync.
 */
export function RouteChangeHandler() {
  const { pathname, hash } = useLocation();
  const lenis = useLenis();

  useLayoutEffect(() => {
    // The new route's DOM is committed here, so measurements are valid now.
    ScrollTrigger.refresh();
    if (hash) return;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    ScrollTrigger.update();
    // Only on navigation — not when Lenis (re)initialises.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
