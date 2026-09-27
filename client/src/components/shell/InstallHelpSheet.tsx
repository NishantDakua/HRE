import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, MoreVertical, PlusSquare, Share, X } from "lucide-react";
import { useInstallApp } from "@/hooks/useInstallApp";

const STEPS = {
  ios: [
    { icon: Share, text: "Tap Share in Safari's toolbar" },
    { icon: PlusSquare, text: "Choose Add to Home Screen" },
  ],
  mobile: [
    { icon: MoreVertical, text: "Open the browser menu" },
    { icon: PlusSquare, text: "Choose Install app or Add to Home screen" },
  ],
  desktop: [
    { icon: MoreVertical, text: "Open the browser menu" },
    { icon: Download, text: "Choose Install Spare" },
  ],
} as const;

/** Manual install steps where the browser has no install prompt (iOS Safari, Firefox, …). */
export function InstallHelpSheet() {
  const { help, closeHelp } = useInstallApp();

  useEffect(() => {
    if (!help) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeHelp();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [help, closeHelp]);

  return (
    <AnimatePresence>
      {help && (
        <>
          <motion.div
            key="install-backdrop"
            className="fixed inset-0 z-[70] bg-ink/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeHelp}
            aria-hidden
          />
          <motion.div
            key="install-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            className="fixed inset-x-0 bottom-0 z-[70] rounded-t-[22px] border-t border-border bg-card px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-card-hover sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-24 sm:w-[380px] sm:-translate-x-1/2 sm:rounded-[22px] sm:border sm:pb-5"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-primary">Download app</p>
                <h2 id="install-title" className="mt-1 font-display text-2xl text-ink">
                  Put Spare on your <em>home screen.</em>
                </h2>
              </div>
              <button type="button" onClick={closeHelp} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-text touch:size-11">
                <X className="size-4" />
              </button>
            </div>
            <ol className="mt-4 space-y-2">
              {STEPS[help].map(({ icon: Icon, text }, i) => (
                <li key={text} className="flex items-center gap-3 rounded-lg bg-paper px-3 py-2.5 text-sm text-text">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="font-mono text-xs text-muted">{i + 1}.</span> {text}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">Spare opens full-screen, like any other app.</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
