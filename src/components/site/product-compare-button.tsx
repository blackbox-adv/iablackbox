"use client";

import { toggleCompare, isInCompare } from "@/hooks/use-compare-count";
import { GitCompare, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ProductCompareButton({ productId }: { productId: string }) {
  // localStorage isn't available during SSR, so we sync on mount + on storage
  // events. This is a legitimate use of setState-in-effect for client-only
  // external state (localStorage).
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    const sync = () => setInCompare(isInCompare(productId));
    sync();
    window.addEventListener("bb-compare-changed", sync);
    return () => window.removeEventListener("bb-compare-changed", sync);
  }, [productId]);

  return (
    <button
      type="button"
      onClick={() => setInCompare(!!toggleCompare(productId))}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        inCompare
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-foreground/20"
      )}
      aria-pressed={inCompare}
    >
      {inCompare ? <Check className="h-3.5 w-3.5" /> : <GitCompare className="h-3.5 w-3.5" />}
      {inCompare ? "En comparador" : "Comparar"}
    </button>
  );
}
