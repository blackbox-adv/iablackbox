"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function OfferButton({
  productId,
  store,
  url,
  disabled,
}: {
  productId: string;
  store: string;
  url: string;
  disabled?: boolean;
}) {
  const onClick = async () => {
    // Track the click (fire and forget)
    try {
      await fetch("/api/clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, store }),
      });
    } catch {
      // ignore — tracking is best-effort
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Button size="sm" onClick={onClick} disabled={disabled} className="gap-1.5 self-start rounded-lg sm:self-auto">
      {disabled ? "Agotado" : "Ver oferta"}
      {!disabled && <ExternalLink className="h-3.5 w-3.5" />}
    </Button>
  );
}
