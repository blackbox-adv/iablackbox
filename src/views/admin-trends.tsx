"use client";

import { useTrends, useGenerateLanding } from "@/hooks/use-blackbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, Loader2, Sparkles, Search, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AdminTrends() {
  const { data, isLoading } = useTrends(true);
  const generateLanding = useGenerateLanding();
  const [customQuery, setCustomQuery] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(true);

  const trends = data?.trends ?? [];

  const onGenerate = async (query: string) => {
    if (!query.trim()) return;
    const t = toast.loading(`Generando landing para "${query}"… (IA)`);
    try {
      const res = await generateLanding.mutateAsync({ query: query.trim() });
      toast.success("Landing generada ✓ (borrador)", { id: t });
      window.open(`/guia/${res.landing.slug}`, "_blank");
    } catch (err) {
      toast.error("Error: " + (err as Error).message, { id: t });
    }
  };

  const onCustomGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(customQuery);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Custom query generator */}
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15">
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </span>
          <div>
            <p className="text-sm font-semibold">Generar landing personalizada</p>
            <p className="text-[11px] text-muted-foreground">Crea una página SEO para cualquier búsqueda</p>
          </div>
        </div>
        <form onSubmit={onCustomGenerate} className="flex gap-2">
          <Input
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="Ej: minoxidil, audífonos bluetooth, cargador USB-C…"
            className="h-10"
          />
          <Button type="submit" disabled={generateLanding.isPending} className="gap-1.5">
            {generateLanding.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generar
          </Button>
        </form>
      </div>

      {/* Trends list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </span>
            <div>
              <p className="text-sm font-semibold">Búsquedas populares sin productos</p>
              <p className="text-[11px] text-muted-foreground">Genera landings para capturar tráfico SEO</p>
            </div>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 py-10 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Aún no hay búsquedas registradas. Cuando los usuarios busquen
              productos que no existen, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {trends.map((trend) => (
              <div
                key={trend.query}
                className="flex items-center gap-4 rounded-xl border border-border/40 glass p-4 transition-colors hover:border-foreground/15"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/30 text-xs font-bold text-muted-foreground">
                  {trend.count}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">"{trend.query}"</p>
                  <p className="text-[11px] text-muted-foreground">
                    {trend.count} búsqueda{trend.count !== 1 ? "s" : ""} · última: {new Date(trend.lastSearched).toLocaleDateString("es-PE")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onGenerate(trend.query)}
                  disabled={generateLanding.isPending}
                  className="shrink-0 gap-1.5 rounded-lg"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generar landing
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
