import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-text transition-colors placeholder:text-muted/70 focus-visible:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-conflict/60",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
