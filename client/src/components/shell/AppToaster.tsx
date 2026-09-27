import { Toaster } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** Top-right on larger screens; top-centre on phones so toasts never sit over the bottom tab bar. */
export function AppToaster() {
  const phone = useMediaQuery("(max-width: 767px)");
  return (
    <Toaster
      richColors
      position={phone ? "top-center" : "top-right"}
      offset={phone ? "calc(env(safe-area-inset-top) + 12px)" : undefined}
      toastOptions={{ className: "font-sans" }}
    />
  );
}
