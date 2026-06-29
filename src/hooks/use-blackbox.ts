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
    mutationFn: (body: Partial<Product> & { name: string; description: string; category: string }) =>
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
