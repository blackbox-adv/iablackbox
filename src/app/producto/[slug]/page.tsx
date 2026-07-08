// SSR product page — /producto/[slug]
// This is the INDEXABLE page Google crawls. Server-rendered with full
// metadata, Schema.org JSON-LD, and all product data in the HTML.

import { db } from "@/lib/db";
import { parseProduct } from "@/lib/api-helpers";
import { STORES, CLASSIFICATIONS, formatPEN, discountPercent, availabilityLabel, timeAgo } from "@/lib/constants";
import { allProductSchemas } from "@/lib/seo";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ScoreRing } from "@/components/blackbox/score-ring";
import { ProductImage } from "@/components/blackbox/product-image";
import { ClassificationBadge, StoreBadge } from "@/components/blackbox/badges";
import { PriceBars } from "@/components/blackbox/price-bars";
import { ProductCompareButton } from "@/components/site/product-compare-button";
import { OfferButton } from "@/components/site/offer-button";
import { ProductChat } from "@/components/site/product-chat";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Truck, ExternalLink, Sparkles, ThumbsUp, ThumbsDown, Target, HelpCircle, Check } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Fetch product + relations, return parsed or null. */
async function getProduct(slug: string) {
  const p = await db.product.findUnique({
    where: { slug },
    include: {
      offers: { orderBy: { price: "asc" } },
      aiScores: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  if (!p || !p.isActive) return null;
  return parseProduct(p);
}

/** SEO metadata per product. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Producto no encontrado · BLACKBOX" };

  const title = product.metaTitle || `${product.name} · Precio, análisis y comparativa · BLACKBOX`;
  const description =
    product.metaDescription ||
    `Análisis IA de ${product.name}. Comparamos precios en Amazon, Temu y Falabella. Score ${product.aiScore?.score ?? "N/A"}/100, ventajas, desventajas y FAQs.`;
  const url = `/producto/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "BLACKBOX",
      images: product.images?.slice(0, 1).map((i) => ({ url: i, width: 1200, height: 1200, alt: product.name })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.images?.slice(0, 1),
    },
  };
}

/** SSG: pre-render product pages at build time (ISR with revalidate). */
export const revalidate = 3600; // revalidate every hour

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const offers = (product.offers ?? []).slice().sort((a, b) => a.price - b.price);
  const minPrice = offers[0]?.price ?? 0;
  const aiScore = product.aiScore;
  const cls = aiScore?.classification ?? "regular";
  const meta = CLASSIFICATIONS[cls];
  const images = product.images ?? [];
  const schemas = allProductSchemas(product);

  // Similar products (same category, exclude self)
  const similarRaw = await db.product.findMany({
    where: { category: product.category, isActive: true, id: { not: product.id } },
    include: { offers: { orderBy: { price: "asc" } }, aiScores: { orderBy: { updatedAt: "desc" }, take: 1 } },
    take: 4,
    orderBy: { updatedAt: "desc" },
  });
  const similar = similarRaw.map(parseProduct);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* JSON-LD structured data for Google rich results */}
        {schemas.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}

        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Inicio</Link>
            <span className="text-muted-foreground/40">/</span>
            <Link href={`/categoria/${encodeURIComponent(product.category.toLowerCase())}`} className="hover:text-foreground">
              {product.category}
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="truncate text-foreground">{product.name}</span>
          </nav>

          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            {/* LEFT: images + info */}
            <div className="space-y-6">
              {/* Image gallery */}
              <div className="relative aspect-square overflow-hidden rounded-3xl border border-border/50 glass shadow-soft">
                <ProductImage src={images[0]} alt={product.name} priority className="h-full w-full" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  {offers[0] && <StoreBadge store={offers[0].store as never} />}
                </div>
              </div>

              {/* Description card */}
              <div className="rounded-3xl border border-border/40 glass p-6 shadow-soft">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Descripción
                </h2>
                <p className="text-[15px] leading-relaxed text-foreground/90">{product.description}</p>

                {product.features?.length > 0 && (
                  <>
                    <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Características
                    </h3>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {product.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
                            <Check className="h-3 w-3 text-emerald-400" />
                          </span>
                          <span className="text-foreground/80">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {product.specs && Object.keys(product.specs).length > 0 && (
                  <>
                    <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Especificaciones
                    </h3>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(product.specs).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 rounded-xl bg-muted/20 px-3 py-2 text-sm">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="font-medium">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
              </div>

              {/* AI analysis: advantages / disadvantages / use cases */}
              {(product.advantages?.length > 0 || product.disadvantages?.length > 0 || product.useCases?.length > 0) && (
                <div className="rounded-3xl border border-border/40 glass p-6 shadow-soft">
                  <div className="mb-5 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    </span>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Análisis IA del producto
                    </h2>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {product.advantages?.length > 0 && (
                      <AnalysisList icon={ThumbsUp} title="Ventajas" items={product.advantages} color="text-emerald-400" />
                    )}
                    {product.disadvantages?.length > 0 && (
                      <AnalysisList icon={ThumbsDown} title="Desventajas" items={product.disadvantages} color="text-rose-400" />
                    )}
                  </div>
                  {product.useCases?.length > 0 && (
                    <div className="mt-5">
                      <AnalysisList icon={Target} title="Casos de uso" items={product.useCases} color="text-lime-400" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: AI recommendation + offers */}
            <div className="space-y-5">
              {/* Title + score */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {product.brand && (
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {product.brand}
                    </span>
                  )}
                  <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{product.name}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
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

              <ProductCompareButton productId={product.id} />

              {/* ✨ BLACKBOX IA RECOMMENDATION — the hero card */}
              {aiScore && (
                <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.04] to-transparent p-6 shadow-glow-primary">
                  <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />
                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 animate-pulse-glow">
                          <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
                        </span>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Recomendación de</p>
                          <p className="text-sm font-bold text-foreground">BLACKBOX IA</p>
                        </div>
                      </div>
                      <span className={`text-2xl font-bold tabular-nums ${meta.scoreColor}`}>{aiScore.score}<span className="text-sm text-muted-foreground">/100</span></span>
                    </div>
                    {aiScore.summary && (
                      <p className="text-[15px] font-medium leading-relaxed text-foreground">{aiScore.summary}</p>
                    )}
                    {aiScore.reasoning && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{aiScore.reasoning}</p>
                    )}
                    {aiScore.recommendation && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-background/40 p-3.5 backdrop-blur-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </span>
                        <p className="text-sm font-medium text-foreground">{aiScore.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Price comparison bars */}
              {offers.length > 0 && (
                <div className="rounded-3xl border border-border/40 glass p-6 shadow-soft">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Comparación de precios
                  </h2>
                  <PriceBars product={product} />
                </div>
              )}

              {/* Store offers */}
              <div className="rounded-3xl border border-border/40 glass p-6 shadow-soft">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ofertas por tienda
                </h2>
                <div className="space-y-3">
                  {offers.map((o) => {
                    const isBest = o.price === minPrice;
                    const disc = discountPercent(o.price, o.originalPrice);
                    const av = availabilityLabel(o.availability);
                    return (
                      <div
                        key={o.id}
                        className={`relative flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                          isBest
                            ? "border-emerald-500/40 bg-emerald-500/[0.06] shadow-soft"
                            : "border-border/40 bg-background/20 hover:bg-background/30"
                        }`}
                      >
                        {isBest && (
                          <span className="absolute -top-2.5 left-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-emerald-950 shadow-soft">
                            🔥 MEJOR PRECIO
                          </span>
                        )}
                        <div className="flex items-center gap-3.5">
                          <StoreBadge store={o.store as never} />
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className={`text-xl font-bold tabular-nums ${isBest ? "text-emerald-400" : "text-foreground"}`}>
                                {formatPEN(o.price)}
                              </span>
                              {disc && (
                                <span className="inline-flex items-center rounded-md bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-soft">
                                  -{disc}%
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                {o.shippingTime}
                              </span>
                              <span className={`inline-flex items-center gap-1 ${av.className}`}>
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
                        <OfferButton
                          productId={product.id}
                          store={o.store}
                          url={o.affiliateLink}
                          disabled={o.availability === "out_of_stock"}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Precios actualizados {offers[0] ? timeAgo(offers[0].updatedAt) : "—"} · Links de afiliado
                </p>
              </div>

              {/* ✨ Conversational AI chat — the "wow" differentiator */}
              <ProductChat productId={product.id} />
            </div>
          </div>

          {/* FAQs */}
          {product.faqs && product.faqs.length > 0 && (
            <section className="mt-10 rounded-3xl border border-border/40 glass p-6 shadow-soft">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <HelpCircle className="h-4 w-4 text-primary" />
                </span>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preguntas frecuentes
                </h2>
              </div>
              <div className="divide-y divide-border/40">
                {product.faqs.map((faq, i) => (
                  <div key={i} className="py-4">
                    <h3 className="text-sm font-semibold text-foreground">{faq.q}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Similar products */}
          {similar.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-6 text-2xl font-bold tracking-tight">Productos similares</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {similar.map((p) => (
                  <Link
                    key={p.id}
                    href={`/producto/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/40 glass transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-float"
                  >
                    <div className="aspect-square overflow-hidden bg-muted/20">
                      <ProductImage src={p.images?.[0]} alt={p.name} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-3.5">
                      <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                      {p.offers?.[0] && (
                        <p className="mt-1.5 text-base font-bold text-emerald-400">{formatPEN(p.offers[0].price)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Source provenance */}
          {product.sourceUrl && (
            <div className="mt-8 flex items-center gap-2.5 rounded-2xl border border-border/30 bg-card/20 px-5 py-3.5 text-xs text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span>
                Información obtenida de{" "}
                <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline-offset-2 hover:underline">
                  {STORES[product.sourceStore as keyof typeof STORES]?.label ?? "tienda afiliada"}
                </a>
                {product.lastFetchedAt && <span className="ml-1">· actualizada {timeAgo(product.lastFetchedAt)}</span>}
              </span>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
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
      <h3 className={`mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${color}`}>
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg bg-current/10`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current ${color}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
