import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useMatch } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, BadgeCheck, Check, Loader2, MapPin, MessageCircle, RotateCcw, Send, Sparkles, Star, X } from "lucide-react";
import { PriceTag } from "@/components/PriceTag";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { apiErrorMessage } from "@/lib/api";
import { confirmAction, streamChat, type BookingCard, type ConfirmCard, type MatchCard, type UIBlock } from "@/lib/chat";
import type { BookingStatus, PriceUnit } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useAppStore } from "@/store/app";

type Entry = { id: string; role: "user"; text: string } | { id: string; role: "assistant"; block: UIBlock };
type ActionState = "open" | "busy" | "confirmed" | "cancelled";

const SUGGESTIONS = {
  seeker: [
    "Need 150 chairs in Andheri this Saturday, 6–11 pm",
    "A refrigerated van tomorrow 8 am to 2 pm",
    "2 projectors in Bandra tomorrow evening",
    "What's happening with my requests?",
  ],
  provider: ["Any new requests for my listings?", "Show requests waiting for my reply"],
};

let nextId = 0;
const uid = () => `m${++nextId}`;

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

function OptionCard({ m, disabled, onBook, onNavigate }: { m: MatchCard; disabled: boolean; onBook: (m: MatchCard) => void; onNavigate: () => void }) {
  return (
    <div className="rounded-md border border-border bg-paper/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{m.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-0.5">
              {m.provider}
              {m.verified && <BadgeCheck className="size-3 text-primary" aria-label="Verified" />}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="size-3" /> {m.area} · {m.distanceKm} km
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-accent text-accent" strokeWidth={0} /> {m.rating.toFixed(1)}
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-available/10 px-2 py-0.5 font-mono text-[11px] text-available">{m.matchScore}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-[11px] text-muted">
          <PriceTag amount={m.price} unit={m.unit as PriceUnit} size="sm" />
          <p className="mt-0.5">
            covers {formatINR(m.fulfils)} {m.unitLabel} · ₹{formatINR(m.landed)} landed
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button asChild size="sm" variant="ghost" className="h-8 px-2.5">
            <Link to={`/resource/${m.resourceId}`} onClick={onNavigate} aria-label={`Details for ${m.title}`}>
              <ArrowUpRight />
            </Link>
          </Button>
          <Button size="sm" className="h-8" disabled={disabled} onClick={() => onBook(m)}>
            Book
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmBlock({ action, state, onDecide }: { action: ConfirmCard; state: ActionState; onDecide: (d: "confirm" | "cancel") => void }) {
  return (
    <div className={cn("rounded-md border p-3", state === "confirmed" ? "border-available/40 bg-available/5" : "border-primary/40 bg-primary/5")}>
      <p className="eyebrow">{action.kind === "book" ? "Confirm request" : "Confirm reply"}</p>
      <p className="mt-1 text-sm font-medium text-text">{action.title}</p>
      <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
        {action.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {action.total !== undefined && (
        <p className="mt-2 flex items-baseline justify-between border-t border-border pt-2 text-xs text-muted">
          Estimated total <PriceTag amount={action.total} size="sm" />
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {state === "open" || state === "busy" ? (
          <>
            <Button size="sm" className="h-8" disabled={state === "busy"} onClick={() => onDecide("confirm")}>
              {state === "busy" ? <Loader2 className="animate-spin" /> : <Check />} Confirm
            </Button>
            <Button size="sm" variant="outline" className="h-8" disabled={state === "busy"} onClick={() => onDecide("cancel")}>
              Cancel
            </Button>
          </>
        ) : (
          <span className={cn("text-xs", state === "confirmed" ? "text-available" : "text-muted")}>{state === "confirmed" ? "Confirmed" : "Cancelled"}</span>
        )}
      </div>
    </div>
  );
}

function BookingsBlock({ bookings, onNavigate }: { bookings: BookingCard[]; onNavigate: () => void }) {
  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <Link
          key={b.bookingId}
          to={`/requests?id=${b.bookingId}`}
          onClick={onNavigate}
          className="block rounded-md border border-border bg-paper/60 p-3 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-text">{b.title}</p>
            <StatusPill status={b.status as BookingStatus} />
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            <span className="font-mono">{b.ref}</span> · {b.counterpart} · ₹{formatINR(b.total)}
          </p>
          {b.lastOffer && (
            <p className="mt-1 line-clamp-1 text-[11px] text-muted">
              {b.lastOffer.from === "you" ? "You" : "They"} offered ₹{formatINR(b.lastOffer.price)} — “{b.lastOffer.message}”
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Widget                                                              */
/* ------------------------------------------------------------------ */

export function ChatWidget() {
  const mode = useAppStore((s) => s.mode);
  const qc = useQueryClient();
  const wide = useMediaQuery("(min-width: 640px)");
  const onResourcePage = useMatch("/resource/:id") !== null;

  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [entries, busy]);

  const readAloud = useCallback(async () => {
    // Voice disabled for now
  }, []);

  const pushBlocks = (blocks: UIBlock[]) => {
    setEntries((list) => [...list, ...blocks.map((block) => ({ id: uid(), role: "assistant" as const, block }))]);
    setActions((a) => {
      const next = { ...a };
      for (const b of blocks) if (b.type === "confirm") next[b.action.actionId] = "open";
      return next;
    });
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setEntries((list) => [...list, { id: uid(), role: "user", text: message }]);
    setBusy(true);
    const spoken: UIBlock[] = [];
    try {
      await streamChat({ sessionId, message, mode }, (e) => {
        if (e.event === "session") setSessionId(e.sessionId);
        else if (e.event === "status") setStatus(e.text);
        else if (e.event === "delta") {
          setStatus(null);
          setDraft((d) => (d ?? "") + e.text);
        } else if (e.event === "block") {
          setStatus(null);
          // The final text of a model pass replaces its streamed draft.
          if (e.block.type === "text") {
            setDraft(null);
            spoken.push(e.block);
          }
          pushBlocks([e.block]);
        } else if (e.event === "error") {
          setDraft(null);
          pushBlocks([{ type: "result", ok: false, text: e.error }]);
        }
      });
      void readAloud();
    } catch (e) {
      pushBlocks([{ type: "result", ok: false, text: apiErrorMessage(e) }]);
    } finally {
      setDraft(null);
      setStatus(null);
      setBusy(false);
    }
  };

  const decide = async (actionId: string, decision: "confirm" | "cancel") => {
    if (!sessionId) return;
    setActions((a) => ({ ...a, [actionId]: "busy" }));
    setBusy(true);
    try {
      const res = await confirmAction({ sessionId, actionId, decision, mode });
      setActions((a) => ({ ...a, [actionId]: decision === "confirm" ? "confirmed" : "cancelled" }));
      pushBlocks(res.blocks);
      if (res.changed) {
        for (const key of [["bookings"], ["booking"], ["analytics"], ["resources"], ["resource"], ["matches"], ["notifications"]]) {
          qc.invalidateQueries({ queryKey: key });
        }
        const result = res.blocks.find((b) => b.type === "result");
        if (result?.type === "result" && result.ok) toast.success(result.text);
      }
      void readAloud();
    } catch (e) {
      setActions((a) => ({ ...a, [actionId]: "open" }));
      pushBlocks([{ type: "result", ok: false, text: apiErrorMessage(e) }]);
    } finally {
      setBusy(false);
    }
  };


  const reset = () => {
    setEntries([]);
    setActions({});
    setSessionId(undefined);
  };

  const closeOnMobile = () => !wide && setOpen(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const renderBlock = (block: UIBlock) => {
    switch (block.type) {
      case "text":
        return (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">
            {block.text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i} className="font-semibold">{part}</strong> : part))}
          </p>
        );
      case "options":
        return (
          <div className="space-y-2">
            {block.matches.map((m) => (
              <OptionCard
                key={m.resourceId}
                m={m}
                disabled={busy}
                onNavigate={closeOnMobile}
                onBook={(o) => send(`Book ${o.title} (id ${o.resourceId}) — ${Math.min(o.fulfils, block.quantity)} ${o.unitLabel}.`)}
              />
            ))}
          </div>
        );
      case "confirm":
        return <ConfirmBlock action={block.action} state={actions[block.action.actionId] ?? "open"} onDecide={(d) => decide(block.action.actionId, d)} />;
      case "bookings":
        return <BookingsBlock bookings={block.bookings} onNavigate={closeOnMobile} />;
      case "result":
        return (
          <p className={cn("rounded-md px-3 py-2 text-sm", block.ok ? "bg-available/10 text-available" : "bg-conflict/10 text-conflict")}>
            {block.text}
            {block.bookingId && (
              <Link to={`/requests?id=${block.bookingId}`} onClick={closeOnMobile} className="ml-1 underline">
                View
              </Link>
            )}
          </p>
        );
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            type="button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setOpen(true)}
            aria-label="Open booking assistant"
            className={cn(
              "fixed right-4 z-50 grid size-14 place-items-center rounded-full bg-ink text-paper shadow-card-hover transition-transform hover:scale-105 sm:right-6",
              onResourcePage ? "bottom-24 lg:bottom-6" : "bottom-5 sm:bottom-6"
            )}
          >
            <MessageCircle className="size-6" strokeWidth={1.75} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            key="panel"
            role="dialog"
            aria-label="Booking assistant"
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed inset-0 z-50 flex flex-col bg-card sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(600px,calc(100dvh-2.5rem))] sm:w-[380px] sm:rounded-xl sm:border sm:border-border sm:shadow-card-hover"
          >
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-tight text-ink">Spare assistant</p>
                <p className="text-[11px] text-muted">{mode === "provider" ? "Provider · Marol Central Kitchen" : "Seeker · Carter Road Kitchen"}</p>
              </div>
              <button type="button" onClick={reset} aria-label="New conversation" className="grid size-9 place-items-center rounded-full border border-border text-muted hover:text-text">
                <RotateCcw className="size-4" />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="grid size-9 place-items-center rounded-full border border-border text-muted hover:text-text">
                <X className="size-4" />
              </button>
            </header>

            <div ref={scroller} data-lenis-prevent className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
              {entries.length === 0 && (
                <div className="space-y-4 pt-2">
                  <p className="text-[15px] leading-relaxed text-muted">
                    Tell me what you need — or tap the mic and say it. I'll ask anything I'm missing, find the best nearby providers, and book it for you.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS[mode].map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-border bg-paper px-3 py-1.5 text-left text-xs text-text transition-colors hover:border-primary/40">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {entries.map((e) =>
                e.role === "user" ? (
                  <div key={e.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2 text-[15px] text-paper">
                    {e.text}
                  </div>
                ) : (
                  <div key={e.id} className={cn(e.block.type === "text" && "max-w-[92%]")}>
                    {renderBlock(e.block)}
                  </div>
                )
              )}

              {draft && <div className="max-w-[92%]">{renderBlock({ type: "text", text: draft })}</div>}

              {busy && !draft && (
                <div className="flex items-center gap-1 text-muted" aria-label={status ?? "Assistant is typing"}>
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="size-1.5 rounded-full bg-muted" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                  {status && <span className="ml-1.5 text-xs">{status}</span>}
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="border-t border-border px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
              <div className="flex items-end gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your request…"
                  aria-label="Message"
                  enterKeyHint="send"
                  className="h-11 min-w-0 flex-1 truncate rounded-full border border-border bg-paper px-4 text-[15px] text-text placeholder:text-muted/70 focus:border-primary/50 focus:outline-none"
                />
                <Button type="submit" size="icon" className="size-11 shrink-0" disabled={busy || !input.trim()} aria-label="Send">
                  <Send />
                </Button>
              </div>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
