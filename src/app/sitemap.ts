// Dynamic sitemap — lists all active products with slugs for Google indexing.
// Regenerated on each request (ISR with revalidate).

import { db } from "@/lib/db";
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blackbox.app";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    where: { isActive: true, slug: { not: null }, contributionStatus: "approved" },
    select: { slug: true, updatedAt: true, category: true },
    orderBy: { updatedAt: "desc" },
  });

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/producto/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/comparar`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];

  // Category pages
  const categories = await db.product.findMany({
    where: { isActive: true, contributionStatus: "approved" },
    select: { category: true },
    distinct: ["category"],
  });
  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/categoria/${encodeURIComponent(c.category.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Landing pages (published guias)
  const landings = await db.landingPage.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const landingEntries: MetadataRoute.Sitemap = landings.map((l) => ({
    url: `${SITE_URL}/guia/${l.slug}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries, ...landingEntries];
}
