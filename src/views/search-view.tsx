"use client";

import { useSearch, useScrape } from "@/hooks/use-blackbox";
import { useAppStore } from "@/lib/store";
import { ProductCard } from "@/components/blackbox/product-card";
import { ProductGridSkeleton } from "@/components/blackbox/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Search as SearchIcon, Download, AlertCircle, ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export function SearchView({ query }: { query: string }) {
  const goSearch = useAppStore((s) => s.goSearch);
  const goHome = useAppStore((s) => s.goHome);
  const goProduct = useAppStore((s) => s.goProduct);
  const { data, isLoading } = useSearch(query);
  const scrape = useScrape();
  const [localQ, setLocalQ] = useState(query);

  const products = data?.products ?? [];
  const intent = data?.intent;
  const noResults = !isLoading && products.length === 0;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (localQ.trim()) goSearch(localQ.trim());
  };

  const onScrape = async () => {
    const t = toast.loading(`Buscando "${query}" en tiendas…`);
    try {
      const res = await scrape.mutateAsync({ query });
      toast.success("Producto encontrado y agregado", { id: t });
      goProduct(res.product.id);
    } catch {
      toast.error("No se pudo buscar el producto ahora", { id: t });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Search header */}
      <div className="mb-6">
        <button
          onClick={goHome}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <form onSubmit={onSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Buscar producto o necesidad…"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Button type="submit" className="h-11">Buscar</Button>
        </form>
      </div>

      {/* AI intent banner */}
      {intent && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 animate-fade-up">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              IA interpreta tu búsqueda
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{intent.intent}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {intent.suggestedCategory && (
                <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                  Categoría: {intent.suggestedCategory}
                </span>
              )}
              {intent.keywords.slice(0, 5).map((k) => (
                <span key={k} className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                  #{k}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <ProductGridSkeleton count={8} />
      ) : noResults ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
            <AlertCircle className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-semibold">Sin resultados para “{query}”</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Este producto aún no está en BLACKBOX. Podemos buscarlo ahora en las tiendas
            afiliadas (scraping bajo demanda) y analizarlo con IA.
          </p>
          <Button onClick={onScrape} disabled={scrape.isPending} className="mt-5 gap-2">
            <Download className="h-4 w-4" />
            {scrape.isPending ? "Buscando…" : "Buscar en tiendas ahora"}
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {products.length} resultado{products.length !== 1 ? "s" : ""} para{" "}
            <span className="font-medium text-foreground">“{query}”</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
