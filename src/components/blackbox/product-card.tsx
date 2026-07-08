"use client";

import type { Product } from "@/lib/types";
import {
  formatPEN,
  discountPercent,
  STORES,
  CLASSIFICATIONS,
} from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import { bestOffer, scoreOf, classificationOf } from "@/hooks/use-blackbox";
import { ProductImage } from "./product-image";
import { ScoreRing } from "./score-ring";
import { CompareToggle } from "./compare-toggle";
import { ClassificationBadge, DiscountBadge, ViralBadge } from "./badges";
import { ArrowRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const goProduct = useAppStore((s) => s.goProduct);
  const best = bestOffer(product);
  const score = scoreOf(product);
  const cls = classificationOf(product);
  const discount = best ? discountPercent(best.price, best.originalPrice) : null;
  const meta = CLASSIFICATIONS[cls];
  const image = product.images?.[0];

  // If the product has a slug, link to the SSR indexable page /producto/[slug];
  // otherwise fall back to the SPA navigation (for old products without slug).
  const href = product.slug ? `/producto/${product.slug}` : null;
  const className =
    "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-lg hover:shadow-black/20 animate-fade-up";
  const style = { animationDelay: `${Math.min(index * 50, 400)}ms` };

  const inner = (
    <>
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        <ProductImage
          src={image}
          alt={product.name}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {best && <StoreBadgeMini store={best.store} />}
          {product.isViral && <ViralBadge />}
        </div>
        {discount && (
          <div className="absolute right-2 top-2">
            <DiscountBadge percent={discount} />
          </div>
        )}
        <div className="absolute bottom-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <CompareToggle productId={product.id} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {product.name}
          </h3>
          <ScoreRing score={score} classification={cls} size={42} />
        </div>

        <div className="flex items-center gap-1.5">
          <ClassificationBadge classification={cls} />
          {best?.rating ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {best.rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        {/* Price */}
        <div className="mt-auto flex items-end justify-between pt-1">
          <div>
            {best ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn("text-lg font-bold tabular-nums", meta.scoreColor)}>
                    {formatPEN(best.price)}
                  </span>
                  {best.originalPrice && best.originalPrice > best.price && (
                    <span className="text-[11px] text-muted-foreground line-through tabular-nums">
                      {formatPEN(best.originalPrice)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  en {STORES[best.store as keyof typeof STORES]?.label}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Sin ofertas</span>
            )}
          </div>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} className={className} style={style} aria-label={product.name}>
        {inner}
      </a>
    );
  }
  return (
    <article onClick={() => goProduct(product.id)} className={className} style={style} role="link">
      {inner}
    </article>
  );
}

function StoreBadgeMini({ store }: { store: string }) {
  const meta = STORES[store as keyof typeof STORES];
  if (!meta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm",
        meta.badge
      )}
    >
      {meta.label}
    </span>
  );
}
