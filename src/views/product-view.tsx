"use client";

import { useProduct, useAiRecommend, useClick, useAiScore } from "@/hooks/use-blackbox";
import { useAppStore } from "@/lib/store";
import {
  STORES,
  CLASSIFICATIONS,
  formatPEN,
  discountPercent,
  availabilityLabel,
  timeAgo,
} from "@/lib/constants";
import type { Offer, Store, Product, Faq } from "@/lib/types";
import { ProductImage } from "@/components/blackbox/product-image";
import { ScoreRing } from "@/components/blackbox/score-ring";
import {
  ClassificationBadge,
  StoreBadge,
  ViralBadge,
  DiscountBadge,
} from "@/components/blackbox/badges";
import { CompareToggle } from "@/components/blackbox/compare-toggle";
import { PriceBars } from "@/components/blackbox/price-bars";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Truck,
  CheckCircle2,
  ShieldCheck,
  PiggyBank,
  Crown,
  Loader2,
  Check,
  ThumbsUp,
  ThumbsDown,
  Target,
  HelpCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ProductView({ productId }: { productId: string }) {
  const { data, isLoading } = useProduct(productId);
  const goBack = useAppStore((s) => s.goHome);
  const recommend = useAiRecommend();
  const regenScore = useAiScore();
  const click = useClick();
  const [activeImage, setActiveImage] = useState(0);

  const product = data?.product;
  const aiScore = product?.aiScore;

  // Auto-generate detailed recommendation once product is loaded
  useEffect(() => {
    if (product && product.offers?.length && !recommend.data && !recommend.isPending) {
      recommend.mutate({ productId: product.id });
    }
  }, [product?.id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Producto no encontrado.</p>
        <Button onClick={goBack} className="mt-4">Volver al inicio</Button>
      </div>
    );
  }

  const offers = (product.offers ?? []).slice().sort((a, b) => a.price - b.price);
  const minPrice = offers[0]?.price ?? 0;
  const images = product.images?.length ? product.images : [];
  const cls = aiScore?.classification ?? "regular";
  const meta = CLASSIFICATIONS[cls];

  const onRegen = async () => {
    const t = toast.loading("Recalculando score con IA…");
    try {
      await regenScore.mutateAsync({ productId: product.id });
      toast.success("Score actualizado", { id: t });
    } catch {
      toast.error("No se pudo actualizar el score", { id: t });
    }
  };

  const onAffiliateClick = (offer: Offer) => {
    click.mutate({ productId: product.id, store: offer.store });
    window.open(offer.affiliateLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT: images + info */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card/40">
            <ProductImage
              src={images[activeImage]}
              alt={product.name}
              priority
              className="h-full w-full"
            />
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {offers[0] && <StoreBadge store={offers[0].store as Store} />}
              {product.isViral && <ViralBadge />}
            </div>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                    activeImage === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <ProductImage src={img} alt={`${product.name} ${i + 1}`} className="h-full w-full" />
                </button>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Descripción
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90">{product.description}</p>

            {product.features?.length > 0 && (
              <>
                <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Características
                </h3>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {product.specs && Object.keys(product.specs).length > 0 && (
              <>
                <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Especificaciones
                </h3>
                <dl className="grid gap-1.5 sm:grid-cols-2">
                  {Object.entries(product.specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 rounded-lg bg-muted/30 px-3 py-1.5 text-sm">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>

          {/* V2: AI analysis — advantages / disadvantages / use cases */}
          <AnalysisSection product={product} />
        </div>

        {/* RIGHT: AI + offers */}
        <div className="space-y-4">
          {/* Title + score */}
          <div className="flex items-start justify-between gap-3">
            <div>
              {product.brand && (
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {product.brand}
                </span>
              )}
              <h1 className="mt-0.5 text-2xl font-bold leading-tight tracking-tight">{product.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ClassificationBadge classification={cls} />
                {offers[0]?.rating && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {offers[0].rating.toFixed(1)} ({offers[0].reviewCount} reseñas)
                  </span>
                )}
              </div>
            </div>
            <ScoreRing score={aiScore?.score ?? 0} classification={cls} size={64} showLabel />
          </div>

          {/* Compare toggle */}
          <div className="flex items-center gap-2">
            <CompareToggle productId={product.id} variant="button" />
            <Button
              variant="outline"
              size="sm"
              onClick={onRegen}
              disabled={regenScore.isPending}
              className="gap-1.5 rounded-lg"
            >
              {regenScore.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Recalcular IA
            </Button>
          </div>

          {/* AI summary block */}
          {aiScore && (
            <div className={cn("rounded-2xl border bg-card/40 p-5 ring-1", meta.badge, meta.ring)}>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Análisis IA
                </h2>
              </div>
              {aiScore.summary && (
                <p className="text-sm font-medium leading-relaxed text-foreground">{aiScore.summary}</p>
              )}
              {aiScore.reasoning && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{aiScore.reasoning}</p>
              )}
              {aiScore.recommendation && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-background/40 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-sm font-medium text-foreground">{aiScore.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Price comparison bars */}
          {offers.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Comparación de precios
              </h2>
              <PriceBars product={product} />
            </div>
          )}

          {/* Store offers */}
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ofertas por tienda
            </h2>
            <div className="space-y-2.5">
              {offers.map((o) => {
                const isBest = o.price === minPrice;
                const disc = discountPercent(o.price, o.originalPrice);
                const av = availabilityLabel(o.availability);
                return (
                  <div
                    key={o.id}
                    className={cn(
                      "relative flex flex-col gap-3 rounded-xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between",
                      isBest ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-background/30"
                    )}
                  >
                    {isBest && (
                      <span className="absolute -top-2 left-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                        MEJOR PRECIO
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      <StoreBadge store={o.store as Store} />
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className={cn("text-lg font-bold tabular-nums", isBest ? "text-emerald-400" : "text-foreground")}>
                            {formatPEN(o.price)}
                          </span>
                          {disc && <DiscountBadge percent={disc} />}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {o.shippingTime}
                          </span>
                          <span className={cn("inline-flex items-center gap-1", av.className)}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {av.label}
                          </span>
                          {o.rating && (
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {o.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAffiliateClick(o)}
                      disabled={o.availability === "out_of_stock"}
                      className="gap-1.5 self-start rounded-lg sm:self-auto"
                    >
                      {o.availability === "out_of_stock" ? "Agotado" : "Ver oferta"}
                      {o.availability !== "out_of_stock" && <ExternalLink className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Precios actualizados {offers[0] ? timeAgo(offers[0].updatedAt) : "—"} · Links de afiliado
            </p>
          </div>

          {/* Detailed AI recommendation */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Recomendación detallada IA
              </h2>
            </div>
            {recommend.isPending ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Generando análisis…
              </div>
            ) : recommend.data ? (
              <div className="space-y-3">
                <p className="text-sm font-medium leading-relaxed text-foreground">{recommend.data.summary}</p>
                <RecRow icon={Crown} label="Mejor opción" text={recommend.data.bestOption} color="text-emerald-400" />
                <RecRow icon={PiggyBank} label="Alternativa barata" text={recommend.data.cheapAlternative} color="text-amber-400" />
                <RecRow icon={ShieldCheck} label="Alternativa premium" text={recommend.data.premiumAlternative} color="text-lime-400" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No disponible.</p>
            )}
          </div>
        </div>
      </div>

      {/* V2: FAQs (full width) */}
      <FaqSection product={product} />

      {/* V2: source provenance */}
      {product.sourceUrl && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card/30 px-4 py-3 text-xs text-muted-foreground">
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span>
            Información obtenida de{" "}
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              {STORES[product.sourceStore as keyof typeof STORES]?.label ?? "tienda afiliada"}
            </a>
            {product.lastFetchedAt && (
              <span className="ml-1">· actualizada {timeAgo(product.lastFetchedAt)}</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function RecRow({
  icon: Icon,
  label,
  text,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  text: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-background/40 p-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", color)} />
      <div>
        <p className={cn("text-xs font-semibold uppercase tracking-wide", color)}>{label}</p>
        <p className="mt-0.5 text-sm text-foreground/90">{text}</p>
      </div>
    </div>
  );
}

// V2: AI analysis section — advantages / disadvantages / use cases (real data only)
function AnalysisSection({ product }: { product: Product }) {
  const advantages = product.advantages ?? [];
  const disadvantages = product.disadvantages ?? [];
  const useCases = product.useCases ?? [];
  const hasContent = advantages.length > 0 || disadvantages.length > 0 || useCases.length > 0;

  if (!hasContent) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Análisis IA del producto
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {advantages.length > 0 && (
          <AnalysisList icon={ThumbsUp} title="Ventajas" items={advantages} color="text-emerald-400" />
        )}
        {disadvantages.length > 0 && (
          <AnalysisList icon={ThumbsDown} title="Desventajas" items={disadvantages} color="text-rose-400" />
        )}
      </div>

      {useCases.length > 0 && (
        <div className="mt-4">
          <AnalysisList icon={Target} title="Casos de uso" items={useCases} color="text-lime-400" />
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Análisis basado únicamente en datos reales obtenidos de la tienda. Los campos no
        disponibles se omiten; BLACKBOX no inventa información.
      </p>
    </div>
  );
}

function AnalysisList({
  icon: Icon,
  title,
  items,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div>
      <h3 className={cn("mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", color)}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
            <span className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current", color)} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// V2: FAQs section (AI-generated, real-data-based)
function FaqSection({ product }: { product: Product }) {
  const faqs: Faq[] = product.faqs ?? [];
  if (faqs.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Preguntas frecuentes (IA)
        </h2>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
