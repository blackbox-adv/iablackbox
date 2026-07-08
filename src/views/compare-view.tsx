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
import { GitCompare, X, Trash2, ArrowRight, Trophy, Truck, Star, Shield, Sparkles } from "lucide-react";
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
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl glass-strong text-primary shadow-soft">
            <GitCompare className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Comparador</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Compara hasta 4 productos lado a lado
            </p>
          </div>
        </div>
        {selected.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearCompare} className="gap-1.5 rounded-full border-border/50">
            <Trash2 className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {selected.length === 0 ? (
        <div className="space-y-8">
          {/* Empty state */}
          <div className="relative overflow-hidden rounded-3xl border border-border/50 glass px-6 py-14 text-center shadow-soft">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-80 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[80px]" />
            <div className="relative">
              <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl glass-strong">
                <GitCompare className="h-8 w-8 text-emerald-400" />
              </span>
              <h3 className="text-xl font-semibold">Aún no has seleccionado productos</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Usa el botón <span className="font-medium text-foreground">Comparar</span> en cualquier
                producto para añadirlo aquí y comparar precio, calidad, envío y más.
              </p>
              <Button onClick={() => goSearch("")} className="mt-6 gap-2 rounded-xl shadow-soft">
                Explorar productos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Suggested products */}
          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <>
              <h2 className="text-xl font-bold tracking-tight">Productos destacados</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                {allProducts.slice(0, 8).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-3xl border border-border/40 glass shadow-soft lg:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="w-44 p-5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Criterio
                  </th>
                  {selected.map((p) => (
                    <th key={p.id} className="p-5 text-left align-top">
                      <CompareHeader product={p} onRemove={() => useAppStore.getState().toggleCompare(p.id)} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <CompareRow label="Puntuación IA" icon={Sparkles}>
                  {selected.map((p) => {
                    const cls = classificationOf(p);
                    return (
                      <td key={p.id} className="p-5">
                        <ScoreRing score={scoreOf(p)} classification={cls} size={56} showLabel />
                      </td>
                    );
                  })}
                </CompareRow>
                <CompareRow label="Clasificación" icon={Star}>
                  {selected.map((p) => (
                    <td key={p.id} className="p-5">
                      <ClassificationBadge classification={classificationOf(p)} />
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="Mejor precio" icon={Trophy}>
                  {selected.map((p) => {
                    const best = bestOffer(p);
                    const min = lowestPrice(p);
                    const globalMin = Math.min(...selected.map(lowestPrice).filter(Boolean));
                    const isBest = min === globalMin;
                    return (
                      <td key={p.id} className="p-5">
                        {best ? (
                          <div>
                            <span
                              className={cn(
                                "text-2xl font-bold tabular-nums transition-colors",
                                isBest ? "text-emerald-400 text-gradient" : "text-foreground"
                              )}
                            >
                              {formatPEN(min)}
                            </span>
                            {isBest && (
                              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                🔥 MEJOR
                              </span>
                            )}
                            <div className="mt-1.5">
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
                    <td key={p.id} className="p-5 text-sm tabular-nums text-muted-foreground">
                      {highestPrice(p) ? formatPEN(highestPrice(p)) : "—"}
                    </td>
                  ))}
                </CompareRow>
                <CompareRow label="Envío" icon={Truck}>
                  {selected.map((p) => {
                    const best = bestOffer(p);
                    return (
                      <td key={p.id} className="p-5 text-sm">
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
                      <td key={p.id} className="p-5 text-sm">
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
                      <td key={p.id} className="p-5">
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
                  {selected.map((p) => {
                    const href = p.slug ? `/producto/${p.slug}` : null;
                    return (
                      <td key={p.id} className="p-5">
                        {href ? (
                          <a href={href}>
                            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
                              Ver detalle
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => goProduct(p.id)} className="gap-1.5 rounded-xl">
                            Ver detalle
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    );
                  })}
                </CompareRow>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-5 lg:hidden">
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
  const href = product.slug ? `/producto/${product.slug}` : null;
  const onClick = href ? () => { window.location.href = href; } : () => goProduct(product.id);
  return (
    <div className="group relative">
      <button onClick={onClick} className="block w-full text-left">
        <div className="relative mb-3 aspect-square overflow-hidden rounded-2xl border border-border/40 bg-muted/20">
          <ProductImage src={product.images?.[0]} alt={product.name} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
      </button>
      <button
        onClick={onRemove}
        className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full glass-strong text-muted-foreground shadow-soft transition-colors hover:text-rose-400"
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
    <tr className="bg-background/10 transition-colors hover:bg-background/20">
      <td className="p-5">
        {label ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/30">
              <Icon className="h-3.5 w-3.5" />
            </span>
            {label}
          </span>
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted/30">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        )}
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
  const href = product.slug ? `/producto/${product.slug}` : null;
  const onClick = href ? () => { window.location.href = href; } : () => goProduct(product.id);

  return (
    <div className="overflow-hidden rounded-3xl border border-border/40 glass shadow-soft animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex gap-4 p-5">
        <button onClick={onClick} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-muted/20">
          <ProductImage src={product.images?.[0]} alt={product.name} className="h-full w-full" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
            <button onClick={() => toggle(product.id)} className="shrink-0 text-muted-foreground transition-colors hover:text-rose-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ClassificationBadge classification={cls} />
            {best && <StoreBadge store={best.store} />}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-5 pt-0">
        <div className="rounded-xl bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">Score IA</p>
          <p className={cn("text-xl font-bold", meta.scoreColor)}>{scoreOf(product)}<span className="text-xs text-muted-foreground">/100</span></p>
        </div>
        <div className="rounded-xl bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">Mejor precio</p>
          <p className="text-xl font-bold text-emerald-400">{best ? formatPEN(best.price) : "—"}</p>
        </div>
        <div className="rounded-xl bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">Envío</p>
          <p className="text-sm font-medium">{best?.shippingTime ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">Garantía</p>
          <p className="text-sm font-medium">{best ? STORES[best.store as keyof typeof STORES]?.label : "—"}</p>
        </div>
      </div>
      <div className="p-5 pt-0">
        <Button size="sm" variant="outline" onClick={onClick} className="w-full gap-1.5 rounded-xl">
          Ver detalle
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
