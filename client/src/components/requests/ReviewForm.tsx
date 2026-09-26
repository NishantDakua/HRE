import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitReview } from "@/hooks/queries";
import type { BookingDetail, Review, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAGS: Record<Role, string[]> = {
  seeker: ["On time", "As described", "Clean", "Great communication", "Easy handover", "Would rebook"],
  provider: ["Returned on time", "Careful with items", "Clear brief", "Paid promptly", "Would host again"],
};
const RATING_WORDS = ["", "Poor", "Fair", "Good", "Great", "Outstanding"];

const reviewSchema = z.object({
  rating: z.number({ required_error: "Pick a rating" }).int().min(1, "Pick a rating").max(5),
  text: z.string().trim().min(10, "A little more detail (10+ characters)").max(500, "Keep it under 500 characters"),
  tags: z.array(z.string()).max(4, "Pick up to 4"),
});
type ReviewValues = z.infer<typeof reviewSchema>;

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(size, n <= value ? "fill-marigold text-marigold" : "text-line")} />
      ))}
    </span>
  );
}

function SubmittedReview({ review, title }: { review: Review; title: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="eyebrow">{title}</p>
      <div className="mt-2 flex items-center gap-2">
        <Stars value={review.rating} />
        <span className="font-mono text-[11px] text-muted">{format(parseISO(review.createdAt), "d MMM yyyy")}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text">“{review.text}”</p>
      {review.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {review.tags.map((t) => (
            <span key={t} className="rounded-full bg-sand px-2 py-0.5 text-[11px] text-ink">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewPanel({ booking: b, mode }: { booking: BookingDetail; mode: Role }) {
  const me = mode === "seeker" ? b.seekerId : b.provider.id;
  const other = mode === "seeker" ? b.provider : b.seeker;
  const mine = b.reviews?.find((r) => r.byBusinessId === me);
  const theirs = b.reviews?.find((r) => r.byBusinessId !== me);
  const submit = useSubmitReview();
  const [hover, setHover] = useState(0);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReviewValues>({ resolver: zodResolver(reviewSchema), defaultValues: { tags: [], text: "" } });
  const rating = watch("rating") ?? 0;
  const text = watch("text") ?? "";

  return (
    <section aria-labelledby="review-title" className="space-y-3">
      <h3 id="review-title" className="eyebrow">
        Review
      </h3>
      <AnimatePresence mode="popLayout" initial={false}>
        {mine ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <SubmittedReview review={mine} title={`Your review of ${other.name}`} />
          </motion.div>
        ) : (
          <motion.form
            key="form"
            exit={{ opacity: 0, y: -8 }}
            noValidate
            onSubmit={handleSubmit((v) => submit.mutate({ bookingId: b.id, as: mode, ...v }))}
            className="space-y-4 rounded-lg border border-border bg-card p-4"
            aria-label={`Review ${other.name}`}
          >
            <p className="font-display text-xl text-ink">
              How was <em>{other.name}</em>?
            </p>

            <Controller
              control={control}
              name="rating"
              render={({ field }) => (
                <div>
                  <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <motion.button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={field.value === n}
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                        whileTap={{ scale: 0.85 }}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => field.onChange(n)}
                        className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Star className={cn("size-7 transition-colors", n <= (hover || field.value || 0) ? "fill-marigold text-marigold" : "text-line")} />
                      </motion.button>
                    ))}
                    <span className="ml-2 font-hand text-2xl text-terracotta">{RATING_WORDS[hover || rating]}</span>
                  </div>
                  {errors.rating && (
                    <p className="mt-1 text-xs text-conflict" role="alert">
                      {errors.rating.message}
                    </p>
                  )}
                </div>
              )}
            />

            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <fieldset>
                  <legend className="mb-1.5 text-[11px] text-muted">What stood out? (up to 4)</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {TAGS[mode].map((t) => {
                      const on = field.value.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={on}
                          onClick={() => field.onChange(on ? field.value.filter((x) => x !== t) : [...field.value, t])}
                          className={cn(
                            "h-7 rounded-full border px-3 text-xs transition-colors",
                            on ? "border-ink bg-ink text-paper" : "border-border bg-paper text-text hover:border-ink/40"
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  {errors.tags && <p className="mt-1 text-xs text-conflict">{errors.tags.message}</p>}
                </fieldset>
              )}
            />

            <label className="block space-y-1">
              <span className="text-[11px] text-muted">Your review</span>
              <textarea
                rows={3}
                placeholder={mode === "seeker" ? "Condition, handover, anything the next hotel should know…" : "How did the handover and return go?"}
                aria-invalid={!!errors.text}
                className={cn(
                  "w-full resize-none rounded-md border bg-paper px-3 py-2 text-sm text-text placeholder:text-muted/60",
                  errors.text ? "border-conflict/60" : "border-border"
                )}
                {...register("text")}
              />
              <span className="flex justify-between text-[11px]">
                <span className="text-conflict">{errors.text?.message}</span>
                <span className={cn("font-mono", text.length > 500 ? "text-conflict" : "text-muted")}>{text.length}/500</span>
              </span>
            </label>

            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Posting…" : "Post review"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
      {theirs && <SubmittedReview review={theirs} title={`${other.name} reviewed you`} />}
    </section>
  );
}
