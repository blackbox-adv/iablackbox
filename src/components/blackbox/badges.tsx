"use client";

import { STORES, CLASSIFICATIONS, AI_TONES } from "@/lib/constants";
import type { Classification, Store } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export function StoreBadge({ store, className }: { store: Store; className?: string }) {
  const meta = STORES[store];
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        meta.badge,
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
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        meta.badge,
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
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
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
        "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300",
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
    <span className="inline-flex items-center rounded-md bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
      -{percent}%
    </span>
  );
}

export function ToneLabel({ tone }: { tone: string }) {
  const meta = AI_TONES.find((t) => t.key === tone);
  return <span>{meta?.label ?? tone}</span>;
}
