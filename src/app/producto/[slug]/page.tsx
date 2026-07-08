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

        <div className="mx-auto max-w-6xl px-4 py-6">
          {/* Breadcrumbs */}
          <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground">Inicio</Link>
            <span>/</span>
            <Link href={`/categoria/${encodeURIComponent(product.category.toLowerCase())}`} className="hover:text-foreground">
              {product.category}
            </Link>
            <span>/</span>
            <span className="truncate text-foreground">{product.name}</span>
          </nav>

          <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            {/* LEFT: images + info */}
            <div className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card/40">
                <ProductImage src={images[0]} alt={product.name} priority className="h-full w-full" />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  {offers[0] && <StoreBadge store={offers[0].store as never} />}
                </div>
              </div>

              {/* Description + features + specs */}
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

              {/* AI analysis: advantages / disadvantages / use cases */}
              {(product.advantages?.length > 0 || product.disadvantages?.length > 0 || product.useCases?.length > 0) && (
                <div className="rounded-2xl border border-border bg-card/40 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Análisis IA del producto
                    </h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {product.advantages?.length > 0 && (
                      <AnalysisList icon={ThumbsUp} title="Ventajas" items={product.advantages} color="text-emerald-400" />
                    )}
                    {product.disadvantages?.length > 0 && (
                      <AnalysisList icon={ThumbsDown} title="Desventajas" items={product.disadvantages} color="text-rose-400" />
                    )}
                  </div>
                  {product.useCases?.length > 0 && (
                    <div className="mt-4">
                      <AnalysisList icon={Target} title="Casos de uso" items={product.useCases} color="text-lime-400" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: AI + offers */}
            <div className="space-y-4">
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

              <ProductCompareButton productId={product.id} />

              {/* AI summary */}
              {aiScore && (
                <div className={`rounded-2xl border bg-card/40 p-5 ring-1 ${meta.badge} ${meta.ring}`}>
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Opinión IA
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
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
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
                        className={`relative flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                          isBest ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-background/30"
                        }`}
                      >
                        {isBest && (
                          <span className="absolute -top-2 left-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                            MEJOR PRECIO
                          </span>
                        )}
                        <div className="flex items-center gap-3">
                          <StoreBadge store={o.store as never} />
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className={`text-lg font-bold tabular-nums ${isBest ? "text-emerald-400" : "text-foreground"}`}>
                                {formatPEN(o.price)}
                              </span>
                              {disc && (
                                <span className="inline-flex items-center rounded-md bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  -{disc}%
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
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
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Precios actualizados {offers[0] ? timeAgo(offers[0].updatedAt) : "—"} · Links de afiliado
                </p>
              </div>
            </div>
          </div>

          {/* FAQs */}
          {product.faqs && product.faqs.length > 0 && (
            <section className="mt-8 rounded-2xl border border-border bg-card/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Preguntas frecuentes
                </h2>
              </div>
              <div className="divide-y divide-border">
                {product.faqs.map((faq, i) => (
                  <div key={i} className="py-3">
                    <h3 className="text-sm font-semibold text-foreground">{faq.q}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Similar products */}
          {similar.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-xl font-bold tracking-tight">Productos similares</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {similar.map((p) => (
                  <Link
                    key={p.id}
                    href={`/producto/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card/40 transition-all hover:border-foreground/15 hover:shadow-lg"
                  >
                    <div className="aspect-square overflow-hidden bg-muted/30">
                      <ProductImage src={p.images?.[0]} alt={p.name} className="h-full w-full transition-transform group-hover:scale-105" />
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-xs font-medium">{p.name}</p>
                      {p.offers?.[0] && (
                        <p className="mt-1 text-sm font-bold text-emerald-400">{formatPEN(p.offers[0].price)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Source provenance */}
          {product.sourceUrl && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-card/30 px-4 py-3 text-xs text-muted-foreground">
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
      <h3 className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      <ul className="space-y-1.5">
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
