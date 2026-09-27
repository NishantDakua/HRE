import { useSyncExternalStore } from "react";

/** Chrome/Edge's install prompt event (not in lib.dom yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type HelpPlatform = "ios" | "desktop" | "mobile";

interface InstallState {
  /** A captured beforeinstallprompt: install() can show the browser's own dialog. */
  canPrompt: boolean;
  installed: boolean;
  /** Manual-steps sheet (iOS Safari and browsers without the prompt). */
  help: HelpPlatform | null;
}

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = { canPrompt: false, installed: false, help: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<InstallState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

const standalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

// Listen from import time: the event can fire before any component mounts.
if (typeof window !== "undefined") {
  state.installed = standalone();
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    set({ canPrompt: false, installed: true, help: null });
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", () => set({ installed: standalone() }));
}

function helpPlatform(): HelpPlatform {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  return /Android|Mobi/i.test(ua) ? "mobile" : "desktop";
}

/** "Download app": installs Spare as a PWA, or explains how where the browser can't prompt. */
export function useInstallApp() {
  const s = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state
  );

  const install = async () => {
    if (!deferred) return set({ help: helpPlatform() });
    const prompt = deferred;
    deferred = null;
    set({ canPrompt: false });
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") set({ installed: true });
  };

  return {
    /** False once installed (running standalone): hide every install entry point. */
    available: !s.installed,
    install,
    help: s.help,
    closeHelp: () => set({ help: null }),
  };
}
