"use client";

import type { Product } from "@/lib/types";
import {
  formatPEN,
  discountPercent,
  STORES,
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
  const image = product.images?.[0];

  // If the product has a slug, link to the SSR indexable page /producto/[slug];
  // otherwise fall back to the SPA navigation (for old products without slug).
  const href = product.slug ? `/producto/${product.slug}` : null;
  const className =
    "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl glass shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-400/30 hover:shadow-float animate-fade-up";
  const style = { animationDelay: `${Math.min(index * 50, 400)}ms` };

  const inner = (
    <>
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        <ProductImage
          src={image}
          alt={product.name}
          className="h-full w-full group-hover:scale-105"
        />
        {/* Subtle gradient overlay that fades in on hover for depth */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {best && <StoreBadgeMini store={best.store} />}
          {product.isViral && <ViralBadge />}
        </div>
        {discount && (
          <div className="absolute right-3 top-3">
            <DiscountBadge percent={discount} />
          </div>
        )}
        <div className="absolute bottom-3 right-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <CompareToggle productId={product.id} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {product.name}
          </h3>
          <ScoreRing score={score} classification={cls} size={44} />
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
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            {best ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tabular-nums tracking-tight text-gradient">
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
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm",
              "translate-y-1 opacity-0 transition-all duration-300",
              "group-hover:translate-y-0 group-hover:border-emerald-400/30 group-hover:bg-emerald-400/10 group-hover:text-emerald-300 group-hover:opacity-100"
            )}
          >
            Ver producto
            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
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
        "inline-flex items-center rounded-md glass-strong px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide backdrop-blur-sm",
        meta.color
      )}
    >
      {meta.label}
    </span>
  );
}
