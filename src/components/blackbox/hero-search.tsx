"use client";

import { useAppStore } from "@/lib/store";
import { Search, Sparkles, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, type FormEvent } from "react";

const SUGGESTIONS = [
  { label: "audífonos bluetooth", icon: "🎧" },
  { label: "afeitadora eléctrica", icon: "🪒" },
  { label: "smartwatch para correr", icon: "⌚" },
  { label: "cargador USB-C rápido", icon: "🔌" },
  { label: "teclado gamer mecánico", icon: "⌨️" },
  { label: "gadgets virales", icon: "✨" },
];

export function HeroSearch() {
  const goSearch = useAppStore((s) => s.goSearch);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) goSearch(q.trim());
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background — soft glows + grid */}
      <div className="pointer-events-none absolute inset-0 bg-grid mask-fade-b opacity-60" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute top-16 right-16 h-48 w-48 rounded-full bg-lime-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute top-32 left-16 h-40 w-40 rounded-full bg-emerald-600/10 blur-[90px]" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:py-28">
        {/* Badge */}
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur-sm animate-fade-up">
          <Sparkles className="h-3.5 w-3.5" />
          Asesor inteligente de compras con IA
        </span>

        {/* Title */}
        <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl animate-fade-up" style={{ animationDelay: "80ms" }}>
          ¿Qué producto
          <br />
          <span className="text-gradient">quieres comparar</span>
          <br />
          hoy?
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "160ms" }}>
          Comparamos precios en Amazon, Temu y Falabella. La IA analiza cada
          producto y te dice <span className="text-foreground font-medium">qué conviene comprar</span>.
        </p>

        {/* Search — Perplexity style */}
        <form
          onSubmit={onSearch}
          className={`group mt-10 w-full max-w-2xl transition-all duration-300 animate-fade-up ${focused ? "scale-[1.01]" : ""}`}
          style={{ animationDelay: "240ms" }}
        >
          <div className={`relative flex items-center gap-2 rounded-2xl border bg-card/60 p-2 shadow-float backdrop-blur-xl transition-all duration-300 ${
            focused ? "border-emerald-400/40 shadow-glow-primary" : "border-border/60 hover:border-foreground/15"
          }`}>
            <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-emerald-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Escribe el nombre del producto o tu necesidad…"
              className="h-12 flex-1 border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            <Button
              type="submit"
              size="lg"
              className="h-10 shrink-0 rounded-xl px-5 shadow-soft transition-all hover:shadow-float"
            >
              <ArrowRight className="h-4 w-4" />
              <span className="sr-only">Buscar</span>
            </Button>
          </div>
        </form>

        {/* Suggestions */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: "320ms" }}>
          <span className="text-xs font-medium text-muted-foreground">Prueba:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => goSearch(s.label)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-emerald-400/30 hover:bg-emerald-400/5 hover:text-foreground"
            >
              <span aria-hidden>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground animate-fade-up" style={{ animationDelay: "400ms" }}>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Datos reales de tiendas afiliadas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            Análisis IA en cada producto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Comparación de precios
          </span>
        </div>
      </div>
    </section>
  );
}
