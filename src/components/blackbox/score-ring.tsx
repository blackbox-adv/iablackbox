"use client";

import { CLASSIFICATIONS } from "@/lib/constants";
import type { Classification } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  classification,
  size = 56,
  showLabel = false,
}: {
  score: number;
  classification: Classification;
  size?: number;
  showLabel?: boolean;
}) {
  const meta = CLASSIFICATIONS[classification] ?? CLASSIFICATIONS.regular;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;

  const colorClass =
    classification === "excellent"
      ? "text-emerald-400"
      : classification === "good"
      ? "text-lime-400"
      : classification === "regular"
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="text-zinc-700/50"
            stroke="currentColor"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={cn(
              "transition-all duration-1000 ease-out [filter:drop-shadow(0_0_4px_currentColor)]",
              colorClass
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-base font-bold tabular-nums tracking-tight [text-shadow:0_0_10px_currentColor]",
              colorClass
            )}
          >
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold", colorClass)}>
          {meta.emoji} {meta.label}
        </span>
      )}
    </div>
  );
}
