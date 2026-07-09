"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, GitCompare, Settings, Boxes, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { useCompareCount } from "@/hooks/use-compare-count";
import { useState, type FormEvent } from "react";

export function SiteHeader() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const compareCount = useCompareCount();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/buscar?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="BLACKBOX inicio">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
            <Boxes className="h-4.5 w-4.5 text-black" />
          </span>
          <span className="hidden text-base font-bold tracking-tight sm:block">
            BLACK<span className="text-emerald-400">BOX</span>
          </span>
        </Link>

        <form onSubmit={onSearch} className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca un producto o necesidad…"
            className="h-9 rounded-full border-border/60 bg-card/60 pl-9 pr-4 text-sm focus-visible:ring-primary/40"
          />
        </form>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="sm" asChild className="relative gap-1.5 rounded-full px-3">
            <Link href="/comparar">
              <GitCompare className="h-4 w-4" />
              <span className="hidden sm:inline">Comparar</span>
              {compareCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {compareCount}
                </span>
              )}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 rounded-full px-3">
            <Link href="/admin">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Control</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
      <div className="border-t border-border/40 bg-emerald-500/5">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1 text-[11px] text-emerald-300/80">
          <Sparkles className="h-3 w-3" />
          <span className="font-medium">BLACKBOX IA</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">comparamos Amazon, Temu y Falabella por ti</span>
        </div>
      </div>
    </header>
  );
}
