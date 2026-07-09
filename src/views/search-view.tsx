"use client";

import { useSearch, useContribute } from "@/hooks/use-blackbox";
import { useAppStore } from "@/lib/store";
import { ProductCard } from "@/components/blackbox/product-card";
import { ProductGridSkeleton } from "@/components/blackbox/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Search as SearchIcon, ArrowLeft, PackageSearch, Link2, Loader2, CheckCircle2, Send } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";

export function SearchView({ query }: { query: string }) {
  const goSearch = useAppStore((s) => s.goSearch);
  const goHome = useAppStore((s) => s.goHome);
  const { data, isLoading } = useSearch(query);

  const products = data?.products ?? [];
  const intent = data?.intent;
  const noResults = !isLoading && products.length === 0;

  const [localQ, setLocalQ] = useState(query);

  // Log every search (best-effort, fire-and-forget)
  useEffect(() => {
    if (!query.trim()) return;
    fetch("/api/search-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, hasResults: products.length > 0 }),
    }).catch(() => {});
  }, [query, products.length]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (localQ.trim()) goSearch(localQ.trim());
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
        <ContributeCard query={query} />
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

// ---------- Contribution card (when no results) ----------
function ContributeCard({ query }: { query: string }) {
  const contribute = useContribute();
  const goHome = useAppStore((s) => s.goHome);
  const [url, setUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const t = toast.loading("Analizando producto… (scraping + IA)");
    try {
      const res = await contribute.mutateAsync({ url: url.trim() });
      toast.success("Producto enviado para revisión ✓", { id: t });
      setSubmitted(true);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("no devolvió datos") || msg.includes("anti-scraping")) {
        toast.error("La tienda bloqueó el scraping. Intenta con otra URL.", { id: t });
      } else if (msg.includes("rate") || msg.includes("429")) {
        toast.error("Has alcanzado el límite de contribuciones (3 por día)", { id: t });
      } else {
        toast.error("Error: " + msg, { id: t });
      }
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-lg font-semibold">¡Producto enviado!</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Nuestro equipo revisará el producto y lo publicará pronto. Mientras
          tanto, la IA ya generó su análisis. ¡Gracias por contribuir!
        </p>
        <Button variant="outline" onClick={goHome} className="mt-5">
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
        <PackageSearch className="h-7 w-7" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">Sin resultados para “{query}”</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        ¿Encontraste este producto en otra tienda? Pega el enlace y lo
        analizaremos con IA para agregarlo a BLACKBOX.
      </p>

      <form onSubmit={onSubmit} className="mt-5 w-full max-w-lg space-y-3">
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.amazon.com/dp/… o https://temu.to/…"
            className="h-11 rounded-xl pl-9"
            type="url"
            required
            autoFocus
          />
        </div>
        <Button
          type="submit"
          disabled={contribute.isPending}
          className="w-full gap-2 rounded-xl"
        >
          {contribute.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analizando…</>
          ) : (
            <><Send className="h-4 w-4" /> Contribuir producto</>
          )}
        </Button>
      </form>

      <p className="mt-3 text-[11px] text-muted-foreground">
        El producto será revisado por un admin antes de publicarse. BLACKBOX no
        inventa datos: si la tienda bloquea el scraping, te avisaremos.
      </p>
    </div>
  );
}
