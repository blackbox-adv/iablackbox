"use client";

import { useAppStore } from "@/lib/store";
import { Search, GitCompare, Settings, Boxes, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, type FormEvent } from "react";

export function Header() {
  const view = useAppStore((s) => s.view);
  const goHome = useAppStore((s) => s.goHome);
  const goCompare = useAppStore((s) => s.goCompare);
  const goAdmin = useAppStore((s) => s.goAdmin);
  const goSearch = useAppStore((s) => s.goSearch);
  const compareCount = useAppStore((s) => s.compareIds.length);
  const [q, setQ] = useState("");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) goSearch(q.trim());
  };

  const isAdmin = view.name === "admin";

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4">
        {/* Logo */}
        <button
          onClick={goHome}
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="BLACKBOX inicio"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <Boxes className="h-5 w-5 text-black" />
          </span>
          <span className="hidden text-lg font-bold tracking-tight sm:block">
            BLACK<span className="text-emerald-400">BOX</span>
          </span>
        </button>

        {/* Search */}
        <form onSubmit={onSearch} className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto…"
            className="h-10 rounded-full border-border/40 bg-card/50 pl-10 pr-4 text-sm backdrop-blur-sm focus-visible:ring-emerald-400/30"
          />
        </form>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={goCompare}
            className={cn(
              "relative gap-1.5 rounded-full px-3.5 transition-all hover:bg-card/60",
              view.name === "compare" && "bg-card/60"
            )}
          >
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Comparar</span>
            {compareCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-emerald-950 shadow-soft">
                {compareCount}
              </span>
            )}
          </Button>
          <Button
            variant={isAdmin ? "default" : "ghost"}
            size="sm"
            onClick={goAdmin}
            className={cn(
              "gap-1.5 rounded-full px-3.5 transition-all",
              !isAdmin && "hover:bg-card/60"
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Control</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
      {/* AI strip */}
      <div className="border-t border-border/20 bg-emerald-500/[0.03]">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-[11px] text-emerald-300/70">
          <Sparkles className="h-3 w-3" />
          <span className="font-medium">BLACKBOX IA</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">comparamos Amazon, Temu y Falabella por ti</span>
        </div>
      </div>
    </header>
  );
}
