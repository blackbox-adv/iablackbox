"use client";

import { useProducts, lowestPrice, highestPrice, scoreOf, classificationOf, bestOffer } from "@/hooks/use-blackbox";
import { useAppStore } from "@/lib/store";
import { ProductCard } from "@/components/blackbox/product-card";
import { ProductGridSkeleton } from "@/components/blackbox/skeletons";
import { ScoreRing } from "@/components/blackbox/score-ring";
import { ClassificationBadge, StoreBadge } from "@/components/blackbox/badges";
import { ProductImage } from "@/components/blackbox/product-image";
import { Button } from "@/components/ui/button";
import { STORES, CLASSIFICATIONS, formatPEN, availabilityLabel } from "@/lib/constants";
import type { Product } from "@/lib/types";
import { GitCompare, X, Trash2, ArrowRight, Trophy, Truck, Star, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompareView({ productIds }: { productIds?: string[] }) {
  const compareIds = useAppStore((s) => s.compareIds);
  const ids = productIds && productIds.length ? productIds : compareIds;
  const clearCompare = useAppStore((s) => s.clearCompare);
  const goProduct = useAppStore((s) => s.goProduct);
  const goSearch = useAppStore((s) => s.goSearch);
  const { data, isLoading } = useProducts({ limit: 50 });

  const allProducts = data?.products ?? [];
  const selected: Product[] = ids
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GitCompare className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comparador</h1>
            <p className="text-sm text-muted-foreground">
              Compara hasta 4 productos lado a lado
            </p>
          </div>
        </div>
        {selected.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearCompare} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {selected.length === 0 ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no has seleccionado productos. Usa el botón{" "}
              <span className="font-medium text-foreground">Comparar</span> en cualquier
              producto para añadirlo aquí.
            </p>
            <Button onClick={() => goSearch("")} className="mt-4 gap-2">
              Explorar productos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <>
              <h2 className="text-lg font-semibold">Productos destacados</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {allProducts.slice(0, 8).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Comparison table - desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-border lg:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-card/40">
                  <th className="w-40 p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Criterio
                  </th>
                  {selected.map((p) => (
                    <th key={p.id} className="p-4 text-left align-top">
                      <CompareHeader product={p} onRemove={() => useAppStore.getState().toggleCompare(p.id)} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <CompareRow label="Puntuación IA" icon={Trophy}>
                  {selected.map((p) => {
                    const cls = classificationOf(p);
                    return (
                      <td key={p.id} className="p-4">
                        <ScoreRing score={scoreOf(p)} classification={cls} size={56} showLabel />
                      </td>
                    );
                  })}
                </CompareRow>
                <CompareRow label="Clasificación" icon={Star}>
                  {selected.map((p) => (
                    <td key={p.id} className="p-4">
                      <ClassificationBadge classification={classificationOf(p)} />
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="Mejor precio" icon={Trophy}>
                  {selected.map((p) => {
                    const best = bestOffer(p);
                    const min = lowestPrice(p);
                    const globalMin = Math.min(...selected.map(lowestPrice).filter(Boolean));
                    return (
                      <td key={p.id} className="p-4">
                        {best ? (
                          <div>
                            <span
                              className={cn(
                                "text-xl font-bold tabular-nums",
                                min === globalMin ? "text-emerald-400" : "text-foreground"
                              )}
                            >
                              {formatPEN(min)}
                            </span>
                            <div className="mt-1">
                              <StoreBadge store={best.store} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </CompareRow>
                <CompareRow label="Precio más alto" icon={Trophy}>
                  {selected.map((p) => (
                    <td key={p.id} className="p-4 text-sm tabular-nums text-muted-foreground">
                      {highestPrice(p) ? formatPEN(highestPrice(p)) : "—"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="Envío" icon={Truck}>
                  {selected.map((p) => {
                    const best = bestOffer(p);
                    return (
                      <td key={p.id} className="p-4 text-sm">
                        {best?.shippingTime ?? "—"}
                      </td>
                    );
                  })}
                </CompareRow>
                <CompareRow label="Garantía / Tienda" icon={Shield}>
                  {selected.map((p) => {
                    const best = bestOffer(p);
                    const storeMeta = best ? STORES[best.store as keyof typeof STORES] : null;
                    return (
                      <td key={p.id} className="p-4 text-sm">
                        {storeMeta ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-emerald-400" />
                            {storeMeta.label}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </CompareRow>
                <CompareRow label="Disponibilidad" icon={Truck}>
                  {selected.map((p) => {
                    const best = bestOffer(p);
                    const av = best ? availabilityLabel(best.availability) : null;
                    return (
                      <td key={p.id} className="p-4">
                        {av ? (
                          <span className={cn("text-sm font-medium", av.className)}>{av.label}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </CompareRow>
                <CompareRow label="" icon={ArrowRight}>
                  {selected.map((p) => (
                    <td key={p.id} className="p-4">
                      <Button size="sm" variant="outline" onClick={() => goProduct(p.id)} className="gap-1.5">
                        Ver detalle
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  ))}
                </CompareRow>
              </tbody>
            </table>
          </div>

          {/* Comparison cards - mobile */}
          <div className="space-y-4 lg:hidden">
            {selected.map((p, i) => (
              <CompareCardMobile key={p.id} product={p} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CompareHeader({ product, onRemove }: { product: Product; onRemove: () => void }) {
  const goProduct = useAppStore((s) => s.goProduct);
  return (
    <div className="group relative">
      <button onClick={() => goProduct(product.id)} className="block w-full text-left">
        <div className="relative mb-2 aspect-square overflow-hidden rounded-lg border border-border bg-muted/30">
          <ProductImage src={product.images?.[0]} alt={product.name} className="h-full w-full" />
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
      </button>
      <button
        onClick={onRemove}
        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
        aria-label="Quitar del comparador"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CompareRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <tr className="bg-background/20">
      <td className="p-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
      </td>
      {children}
    </tr>
  );
}

function CompareCardMobile({ product, index }: { product: Product; index: number }) {
  const goProduct = useAppStore((s) => s.goProduct);
  const toggle = useAppStore((s) => s.toggleCompare);
  const cls = classificationOf(product);
  const best = bestOffer(product);
  const meta = CLASSIFICATIONS[cls];
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex gap-3">
        <button onClick={() => goProduct(product.id)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30">
          <ProductImage src={product.images?.[0]} alt={product.name} className="h-full w-full" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
            <button onClick={() => toggle(product.id)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ClassificationBadge classification={cls} />
            {best && <StoreBadge store={best.store} />}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/30 p-2">
          <p className="text-muted-foreground">Score IA</p>
          <p className={cn("text-lg font-bold", meta.scoreColor)}>{scoreOf(product)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <p className="text-muted-foreground">Mejor precio</p>
          <p className="text-lg font-bold text-emerald-400">{best ? formatPEN(best.price) : "—"}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <p className="text-muted-foreground">Envío</p>
          <p className="font-medium">{best?.shippingTime ?? "—"}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <p className="text-muted-foreground">Garantía</p>
          <p className="font-medium">{best ? STORES[best.store as keyof typeof STORES]?.label : "—"}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={() => goProduct(product.id)} className="mt-3 w-full gap-1.5">
        Ver detalle
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
