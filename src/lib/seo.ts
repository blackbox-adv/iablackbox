// Schema.org JSON-LD generators for SEO.
// These produce structured data that Google uses for rich results
// (Product snippets, FAQ accordions, breadcrumbs, reviews).

import type { Product } from "@/lib/types";
import { STORES } from "@/lib/constants";

const SITE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL || "https://blackbox.app";

interface JsonLdProduct {
  name: string;
  image: string[];
  description: string;
  sku?: string;
  brand?: { "@type": string; name: string };
  offers: Array<{
    "@type": string;
    price: number;
    priceCurrency: string;
    availability: string;
    url: string;
    seller: { "@type": string; name: string };
  }>;
  aggregateRating?: {
    "@type": string;
    ratingValue: number;
    reviewCount: number;
  };
}

/** Product schema with offers + aggregate rating. */
export function productJsonLd(product: Product): Record<string, unknown> {
  const offers = (product.offers ?? []).map((o) => ({
    "@type": "Offer",
    price: o.price,
    priceCurrency: o.currency || "PEN",
    availability:
      o.availability === "in_stock"
        ? "https://schema.org/InStock"
        : o.availability === "out_of_stock"
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    url: o.affiliateLink,
    seller: {
      "@type": "Organization",
      name: STORES[o.store as keyof typeof STORES]?.label ?? o.store,
    },
  }));

  const best = product.offers?.[0];
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.aiScore?.summary || "",
    image: (product.images ?? []).slice(0, 4),
    offers,
  };

  if (product.brand) {
    schema["brand"] = { "@type": "Brand", name: product.brand };
  }
  if (best?.rating && best.rating > 0) {
    schema["aggregateRating"] = {
      "@type": "AggregateRating",
      ratingValue: best.rating,
      reviewCount: best.reviewCount || 1,
    };
  }
  return schema;
}

/** FAQ schema from product.faqs. */
export function faqJsonLd(product: Product): Record<string, unknown> | null {
  if (!product.faqs || product.faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: product.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Breadcrumb: Home > Category > Product. */
export function breadcrumbJsonLd(
  product: Product,
  siteUrl = SITE_URL
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category,
        item: `${siteUrl}/categoria/${encodeURIComponent(product.category.toLowerCase())}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${siteUrl}/producto/${product.slug}`,
      },
    ],
  };
}

/** Review schema from AI score — gives Google a star rating. */
export function reviewJsonLd(product: Product): Record<string, unknown> | null {
  if (!product.aiScore) return null;
  // Map 0-100 score to 1-5 stars
  const stars = Math.round((product.aiScore.score / 100) * 5 * 10) / 10;
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    reviewRating: { "@type": "Rating", ratingValue: stars, bestRating: 5 },
    author: { "@type": "Organization", name: "BLACKBOX IA" },
    reviewBody: product.aiScore.reasoning || product.aiScore.summary || "",
  };
}

/** All schemas for a product, as an array of JSON-LD objects. */
export function allProductSchemas(product: Product): Record<string, unknown>[] {
  const schemas = [
    productJsonLd(product),
    breadcrumbJsonLd(product),
  ];
  const faq = faqJsonLd(product);
  if (faq) schemas.push(faq);
  const review = reviewJsonLd(product);
  if (review) schemas.push(review);
  return schemas;
}

export { SITE_URL };
