"use client";

import { STORES, formatPEN } from "@/lib/constants";
import type { Product, Store } from "@/lib/types";
import { cn } from "@/lib/utils";

const BAR_COLOR: Record<Store, string> = {
  amazon: "bg-amber-400",
  temu: "bg-orange-400",
  falabella: "bg-emerald-400",
};

export function PriceBars({ product, compact = false }: { product: Product; compact?: boolean }) {
  const offers = product.offers ?? [];
  if (!offers.length) return null;
  const min = Math.min(...offers.map((o) => o.price));
  const max = Math.max(...offers.map((o) => o.price));
  const range = max - min || 1;

  return (
    <div className={cn("space-y-1.5", compact && "space-y-1")}>
      {offers
        .slice()
        .sort((a, b) => a.price - b.price)
        .map((o) => {
          const width = ((max - o.price) / range) * 60 + 40; // 40-100%
          const isBest = o.price === min;
          return (
            <div key={o.id} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[11px] font-medium text-muted-foreground">
                {STORES[o.store as Store]?.label ?? o.store}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted/40">
                <div
                  className={cn("h-full rounded", BAR_COLOR[o.store as Store] ?? "bg-zinc-400", isBest && "ring-1 ring-emerald-400/50")}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span
                className={cn(
                  "w-14 shrink-0 text-right text-[11px] font-semibold tabular-nums",
                  isBest ? "text-emerald-400" : "text-foreground"
                )}
              >
                {formatPEN(o.price)}
              </span>
            </div>
          );
        })}
    </div>
  );
}
