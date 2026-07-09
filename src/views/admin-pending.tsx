"use client";

import { usePendingProducts, useApproveProduct, useRejectProduct } from "@/hooks/use-blackbox";
import { ProductImage } from "@/components/blackbox/product-image";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Package, Clock } from "lucide-react";
import { toast } from "sonner";

export function AdminPending() {
  const { data, isLoading } = usePendingProducts();
  const approve = useApproveProduct();
  const reject = useRejectProduct();

  const products = data?.products ?? [];

  const onApprove = async (id: string, name: string) => {
    const t = toast.loading(`Aprobando "${name}"…`);
    try {
      await approve.mutateAsync(id);
      toast.success("Producto aprobado y publicado ✓", { id: t });
    } catch {
      toast.error("Error al aprobar", { id: t });
    }
  };

  const onReject = async (id: string, name: string) => {
    if (!confirm(`¿Rechazar "${name}"?`)) return;
    const t = toast.loading("Rechazando…");
    try {
      await reject.mutateAsync(id);
      toast.success("Producto rechazado", { id: t });
    } catch {
      toast.error("Error al rechazar", { id: t });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 py-12 text-center">
        <Clock className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          No hay productos pendientes de aprobación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {products.length} producto{products.length !== 1 ? "s" : ""} contribuido{products.length !== 1 ? "s" : ""} por usuarios, pendiente{products.length !== 1 ? "s" : ""} de revisión.
      </p>
      <div className="overflow-hidden rounded-xl border border-border/40 glass">
        <div className="divide-y divide-border/30">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/20">
                <ProductImage src={p.images?.[0]} alt={p.name} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                {p.sourceUrl && (
                  <a
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block truncate text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {p.sourceUrl}
                  </a>
                )}
                {p.offers?.[0] && (
                  <p className="mt-1 text-xs text-emerald-400">
                    S/{p.offers[0].price.toFixed(2)} · {p.sourceStore}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onApprove(p.id, p.name)}
                  disabled={approve.isPending}
                  className="gap-1.5 rounded-lg bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                >
                  <Check className="h-3.5 w-3.5" />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReject(p.id, p.name)}
                  disabled={reject.isPending}
                  className="gap-1.5 rounded-lg text-rose-400 hover:text-rose-300"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
