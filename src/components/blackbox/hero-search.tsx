"use client";

import { useAppStore } from "@/lib/store";
import { Search, Sparkles, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, type FormEvent } from "react";

const SUGGESTIONS = [
  "audífonos bluetooth baratos",
  "afeitadora eléctrica",
  "smartwatch para correr",
  "cargador USB-C rápido",
  "teclado gamer mecánico",
  "gadgets virales de Temu",
];

export function HeroSearch() {
  const goSearch = useAppStore((s) => s.goSearch);
  const [q, setQ] = useState("");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) goSearch(q.trim());
  };

  return (
    <section className="relative overflow-hidden">
      {/* background glows */}
      <div className="pointer-events-none absolute inset-0 bg-grid mask-fade-b" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-10 right-10 h-40 w-40 rounded-full bg-amber-500/10 blur-[80px]" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:py-24">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 animate-fade-up">
          <Sparkles className="h-3.5 w-3.5" />
          Comparador inteligente con IA
        </span>

        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl animate-fade-up" style={{ animationDelay: "60ms" }}>
          Encuentra la mejor oferta
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-lime-300 bg-clip-text text-transparent text-glow">
            antes de comprar
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg animate-fade-up" style={{ animationDelay: "120ms" }}>
          Comparamos precios y te decimos qué conviene. Amazon, Temu y Falabella
          analizados por IA en segundos.
        </p>

        {/* Search bar */}
        <form onSubmit={onSearch} className="mt-8 flex w-full max-w-xl items-center gap-2 animate-fade-up" style={{ animationDelay: "180ms" }}>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busca un producto, categoría o necesidad…"
              className="h-14 rounded-2xl border-border/60 bg-card/70 pl-12 pr-4 text-base shadow-lg shadow-black/20 backdrop-blur focus-visible:ring-2 focus-visible:ring-primary/40"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-14 rounded-2xl px-5 text-base shadow-lg shadow-primary/20"
          >
            <ArrowRight className="h-5 w-5" />
            <span className="sr-only">Buscar</span>
          </Button>
        </form>

        {/* Suggestions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <span className="text-xs text-muted-foreground">Prueba:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => goSearch(s)}
              className="rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
