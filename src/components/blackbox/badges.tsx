"use client";

import { STORES, CLASSIFICATIONS, AI_TONES } from "@/lib/constants";
import type { Classification, Store } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

/**
 * Premium dark-theme badge primitives.
 * Visual refinements only — props & behavior are unchanged.
 * - Glass backgrounds with hairline borders (border-white/[0.08])
 * - backdrop-blur-sm for layered depth
 * - Functional colors per classification / offer type
 */

export function StoreBadge({ store, className }: { store: Store; className?: string }) {
  const meta = STORES[store];
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md glass-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
        meta.color,
        className
      )}
    >
      {meta.label}
    </span>
  );
}

export function ClassificationBadge({
  classification,
  className,
}: {
  classification: Classification;
  className?: string;
}) {
  const meta = CLASSIFICATIONS[classification] ?? CLASSIFICATIONS.regular;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm",
        meta.scoreColor,
        className
      )}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

export function OfferBadge({
  emoji,
  label,
  className,
}: {
  emoji: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
        className
      )}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </span>
  );
}

export function ViralBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur-sm",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      Viral
    </span>
  );
}

export function DiscountBadge({ percent }: { percent: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-soft ring-1 ring-rose-400/40 backdrop-blur-sm">
      -{percent}%
    </span>
  );
}

export function ToneLabel({ tone }: { tone: string }) {
  const meta = AI_TONES.find((t) => t.key === tone);
  return <span>{meta?.label ?? tone}</span>;
}
