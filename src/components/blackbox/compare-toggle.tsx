"use client";

import { useAppStore } from "@/lib/store";
import { Check, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompareToggle({
  productId,
  variant = "icon",
  className,
}: {
  productId: string;
  variant?: "icon" | "button";
  className?: string;
}) {
  const isIn = useAppStore((s) => s.compareIds.includes(productId));
  const toggle = useAppStore((s) => s.toggleCompare);

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle(productId);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          isIn
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-foreground/20",
          className
        )}
        aria-pressed={isIn}
      >
        {isIn ? <Check className="h-3.5 w-3.5" /> : <GitCompare className="h-3.5 w-3.5" />}
        {isIn ? "En comparador" : "Comparar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
        isIn
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
        className
      )}
      aria-pressed={isIn}
      aria-label={isIn ? "Quitar del comparador" : "Añadir al comparador"}
      title={isIn ? "Quitar del comparador" : "Añadir al comparador"}
    >
      {isIn ? <Check className="h-4 w-4" /> : <GitCompare className="h-4 w-4" />}
    </button>
  );
}
