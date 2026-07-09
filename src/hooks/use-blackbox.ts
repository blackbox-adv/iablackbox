"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, HomeSection, AffiliateLink, AiScore, Classification } from "@/lib/types";

// ---------- fetch helpers ----------
async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------- types for API responses ----------
interface HomeData {
  sections: HomeSection[];
  featured: Product[];
  recommendations: Product[];
  categories: string[];
}
interface ProductsData {
  products: Product[];
  total: number;
}
interface SearchData {
  products: Product[];
  intent: { intent: string; suggestedCategory: string | null; keywords: string[] } | null;
}
interface AiRecommend {
  summary: string;
  bestOption: string;
  cheapAlternative: string;
  premiumAlternative: string;
}

// ---------- hooks ----------
export function useHome() {
  return useQuery<HomeData>({
    queryKey: ["home"],
    queryFn: () => jfetch<HomeData>("/api/home"),
  });
}

export function useProducts(opts?: {
  category?: string;
  q?: string;
  viral?: boolean;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  if (opts?.q) params.set("q", opts.q);
  if (opts?.viral) params.set("viral", "1");
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return useQuery<ProductsData>({
    queryKey: ["products", opts],
    queryFn: () => jfetch<ProductsData>(`/api/products${qs ? `?${qs}` : ""}`),
  });
}

export function useProduct(id: string | null) {
  return useQuery<{ product: Product }>({
    queryKey: ["product", id],
    queryFn: () => jfetch<{ product: Product }>(`/api/products/${id}`),
    enabled: !!id,
  });
}

export function useSearch(query: string) {
  return useQuery<SearchData>({
    queryKey: ["search", query],
    queryFn: () => jfetch<SearchData>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 0,
  });
}

export function useCategories() {
  return useQuery<{ categories: string[] }>({
    queryKey: ["categories"],
    queryFn: () => jfetch<{ categories: string[] }>("/api/categories"),
  });
}

export function useClick() {
  return useMutation({
    mutationFn: (body: { productId: string; store?: string }) =>
      jfetch<{ success: boolean }>("/api/clicks", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

// V2: import a real product from an affiliate URL (scrapes + AI analysis)
export function useImportProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { url: string }) =>
      jfetch<{ product: Product }>("/api/products/import", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

// V2: extract product data from an uploaded screenshot using VLM (vision AI)
export interface PhotoExtracted {
  name: string | null;
  description: string | null;
  brand: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string | null;
  features: string[];
  specs: Record<string, string>;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  availability: string | null;
}

export function usePhotoExtract() {
  return useMutation({
    mutationFn: (body: { image: string; affiliateUrl?: string }) =>
      jfetch<{ extracted: PhotoExtracted; affiliateUrl: string | null }>(
        "/api/products/import-photo",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),
  });
}

// V2: refresh a single product's real data (re-scrape sourceUrl + re-analyze)
export function useRefreshProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      jfetch<{ product: Product }>(`/api/products/${productId}/refresh`, {
        method: "POST",
      }),
    onSuccess: (_data, productId) => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

// V2: bulk refresh several products
export function useBulkRefresh() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      jfetch<{ results: { id: string; success: boolean; error?: string }[] }>(
        "/api/products/bulk-refresh",
        { method: "POST", body: JSON.stringify({ ids }) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

// V2: toggle featured flag
export function useToggleFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      jfetch<{ product: Product }>(`/api/products/${id}/feature`, {
        method: "PUT",
        body: JSON.stringify({ isFeatured }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useAiScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { productId: string }) =>
      jfetch<{ aiScore: AiScore }>("/api/ai/score", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["product", vars.productId] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

// V2: conversational AI chat about a product
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useAiChat() {
  return useMutation({
    mutationFn: (body: { productId: string; question: string; history?: ChatMessage[] }) =>
      jfetch<{ answer: string; productId: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useAiRecommend() {
  return useMutation({
    mutationFn: (body: { productId: string }) =>
      jfetch<AiRecommend>("/api/ai/recommend", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

// ---------- admin hooks ----------
export function useAdminSections() {
  return useQuery<{ sections: HomeSection[] }>({
    queryKey: ["admin-sections"],
    queryFn: () => jfetch<{ sections: HomeSection[] }>("/api/admin/sections"),
  });
}

export function useUpdateSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sections: { id: string; order: number; isActive: boolean }[]) =>
      jfetch<{ sections: HomeSection[] }>("/api/admin/sections", {
        method: "PUT",
        body: JSON.stringify({ sections }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sections"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useAdminAffiliates() {
  return useQuery<{ affiliates: AffiliateLink[] }>({
    queryKey: ["admin-affiliates"],
    queryFn: () => jfetch<{ affiliates: AffiliateLink[] }>("/api/admin/affiliates"),
  });
}

export function useUpsertAffiliate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      id?: string;
      store: string;
      baseUrl: string;
      tagParam?: string;
      tagValue?: string;
    }) => {
      if (body.id) {
        return jfetch<{ affiliate: AffiliateLink }>(`/api/admin/affiliates/${body.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      return jfetch<{ affiliate: AffiliateLink }>("/api/admin/affiliates", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-affiliates"] }),
  });
}

export function useAiSettings() {
  return useQuery<{ settings: Record<string, string> }>({
    queryKey: ["ai-settings"],
    queryFn: () => jfetch<{ settings: Record<string, string> }>("/api/admin/ai-settings"),
  });
}

export function useUpdateAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, string>) =>
      jfetch<{ settings: Record<string, string> }>("/api/admin/ai-settings", {
        method: "PUT",
        body: JSON.stringify({ settings }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-settings"] }),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Product> & {
      name: string;
      description: string;
      category: string;
      offer?: {
        price?: number | null;
        originalPrice?: number | null;
        affiliateLink?: string;
        shippingTime?: string;
        availability?: string;
        currency?: string;
      } | null;
    }) =>
      jfetch<{ product: Product }>("/api/products", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      jfetch<{ product: Product }>(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["product", vars.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      jfetch<{ success: boolean }>(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

// ---------- product helpers ----------
export function lowestPrice(p: Product): number {
  if (!p.offers?.length) return 0;
  return Math.min(...p.offers.map((o) => o.price));
}

export function highestPrice(p: Product): number {
  if (!p.offers?.length) return 0;
  return Math.max(...p.offers.map((o) => o.price));
}

export function bestOffer(p: Product) {
  if (!p.offers?.length) return null;
  return [...p.offers].sort((a, b) => a.price - b.price)[0];
}

export function classificationOf(p: Product): Classification {
  return p.aiScore?.classification ?? "regular";
}

export function scoreOf(p: Product): number {
  return p.aiScore?.score ?? 0;
}

// ---------- V2: search trends + contributions + landings ----------

export interface SearchTrend {
  query: string;
  count: number;
  hasResults: boolean;
  lastSearched: string;
}

export function useTrends(onlyEmpty = false) {
  return useQuery<{ trends: SearchTrend[] }>({
    queryKey: ["trends", onlyEmpty],
    queryFn: () =>
      jfetch<{ trends: SearchTrend[] }>(
        `/api/admin/trends${onlyEmpty ? "?onlyEmpty=1" : ""}`
      ),
  });
}

export function usePendingProducts() {
  const qc = useQueryClient();
  return useQuery<{ products: Product[] }>({
    queryKey: ["pending-products"],
    queryFn: () => jfetch<{ products: Product[] }>("/api/admin/pending"),
  });
}

export function useContribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { url: string }) =>
      jfetch<{ product: Product; status: string; message: string }>(
        "/api/products/contribute",
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-products"] }),
  });
}

export function useApproveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      jfetch<{ product: Product }>(`/api/products/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useRejectProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      jfetch<{ success: boolean }>(`/api/products/${id}/reject`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-products"] }),
  });
}

// ---------- Landings ----------

export interface LandingPage {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string;
  intro: string;
  body: Array<{ type: string; heading: string; content: string }>;
  faqs: Array<{ q: string; a: string }>;
  relatedQuery: string | null;
  status: string;
  category: string | null;
  productIds: string[];
  createdAt: string;
  updatedAt: string;
}

export function useLandings() {
  return useQuery<{ landings: LandingPage[] }>({
    queryKey: ["landings"],
    queryFn: () => jfetch<{ landings: LandingPage[] }>("/api/admin/landings"),
  });
}

export function useGenerateLanding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { query: string }) =>
      jfetch<{ landing: LandingPage }>("/api/landings/generate", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["landings"] }),
  });
}

export function useUpdateLanding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LandingPage> }) =>
      jfetch<{ landing: LandingPage }>(`/api/landings/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["landings"] }),
  });
}

export function useDeleteLanding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      jfetch<{ success: boolean }>(`/api/landings/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["landings"] }),
  });
}
