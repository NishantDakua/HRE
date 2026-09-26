import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParseRequest } from "@/hooks/queries";
import type { ParsedRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXAMPLE = "need 150 chairs + 2 projectors, Andheri, Sat 6–11pm, budget 12k 🙏";

const schema = z.object({
  text: z.string().trim().min(8, "Paste the message you'd send a vendor").max(1000, "Keep it under 1,000 characters"),
});
type Values = z.infer<typeof schema>;

interface PasteParserProps {
  parsed: ParsedRequest | null;
  activeIndex: number;
  onParsed: (parsed: ParsedRequest) => void;
  onPickItem: (index: number) => void;
}

export function PasteParser({ parsed, activeIndex, onParsed, onPickItem }: PasteParserProps) {
  const parse = useParseRequest();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { text: "" } });

  const onSubmit = ({ text }: Values) => parse.mutate(text, { onSuccess: onParsed });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="surface p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="whatsapp" className="flex items-center gap-2 text-sm font-medium text-text">
          <MessageCircle className="size-4 text-peacock" strokeWidth={1.75} />
          Paste your WhatsApp message
        </label>
        <button
          type="button"
          onClick={() => setValue("text", EXAMPLE, { shouldValidate: true })}
          className="text-xs text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
        >
          Try an example
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
        <textarea
          id="whatsapp"
          rows={2}
          placeholder={EXAMPLE}
          aria-invalid={!!errors.text}
          aria-describedby={errors.text ? "whatsapp-error" : undefined}
          data-lenis-prevent
          className={cn(
            "min-h-[64px] w-full flex-1 resize-y rounded-md border bg-mint/25 px-3.5 py-3 text-[15px] leading-snug text-text placeholder:text-muted/70 focus-visible:border-primary/60",
            errors.text ? "border-conflict/60" : "border-border"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSubmit(onSubmit)();
            }
          }}
          {...register("text")}
        />
        <Button type="submit" size="lg" disabled={parse.isPending} className="shrink-0">
          <Sparkles />
          {parse.isPending ? "Reading…" : "Parse & Match"}
        </Button>
      </div>
      {errors.text && (
        <p id="whatsapp-error" className="mt-2 text-xs text-conflict">
          {errors.text.message}
        </p>
      )}

      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
              <span className="text-muted">
                Understood {Math.round(parsed.confidence * 4)}/4 details
                {parsed.items.length > 1 ? " · found" : ""}
              </span>
              {parsed.items.length === 0 && <span className="text-conflict">no item — pick a category below</span>}
              {parsed.items.length > 1 &&
                parsed.items.map((item, i) => (
                  <button
                    key={`${item.category}-${i}`}
                    type="button"
                    aria-pressed={i === activeIndex}
                    onClick={() => onPickItem(i)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 font-mono transition-colors",
                      i === activeIndex ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-muted hover:text-text"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
