"use client";

import { useLandings, useUpdateLanding, useDeleteLanding } from "@/hooks/use-blackbox";
import type { LandingPage } from "@/hooks/use-blackbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Trash2, Eye, ExternalLink, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AdminLandings() {
  const { data, isLoading } = useLandings();
  const updateLanding = useUpdateLanding();
  const deleteLanding = useDeleteLanding();

  const landings = data?.landings ?? [];

  const onTogglePublish = async (landing: LandingPage) => {
    const newStatus = landing.status === "published" ? "draft" : "published";
    const t = toast.loading(newStatus === "published" ? "Publicando…" : "Despublicando…");
    try {
      await updateLanding.mutateAsync({ id: landing.id, data: { status: newStatus } });
      toast.success(newStatus === "published" ? "Landing publicada ✓" : "Landing despublicada", { id: t });
    } catch {
      toast.error("Error", { id: t });
    }
  };

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar la landing "${title}"?`)) return;
    const t = toast.loading("Eliminando…");
    try {
      await deleteLanding.mutateAsync(id);
      toast.success("Landing eliminada", { id: t });
    } catch {
      toast.error("Error", { id: t });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (landings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 py-12 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          No hay landings todavía. Ve a la pestaña "Tendencias" para generar
          tu primera landing con IA.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {landings.length} landing{landings.length !== 1 ? "s" : ""} · {landings.filter((l) => l.status === "published").length} publicada{landings.filter((l) => l.status === "published").length !== 1 ? "s" : ""}
      </p>
      <div className="space-y-2">
        {landings.map((landing) => (
          <div
            key={landing.id}
            className="flex items-center gap-4 rounded-xl border border-border/40 glass p-4"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                landing.status === "published"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/15 text-amber-400"
              )}
            >
              {landing.status === "published" ? <Check className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{landing.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    landing.status === "published"
                      ? "border-emerald-500/30 text-emerald-400"
                      : "border-amber-500/30 text-amber-400"
                  )}
                >
                  {landing.status === "published" ? "Publicada" : "Borrador"}
                </Badge>
                <span className="text-[11px] text-muted-foreground">/guia/{landing.slug}</span>
                {landing.relatedQuery && (
                  <span className="text-[11px] text-muted-foreground">· "{landing.relatedQuery}"</span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                asChild
                className="h-8 w-8 rounded-lg p-0"
                title="Vista previa"
              >
                <a href={`/guia/${landing.slug}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4" />
                </a>
              </Button>
              <Button
                size="sm"
                variant={landing.status === "published" ? "outline" : "default"}
                onClick={() => onTogglePublish(landing)}
                disabled={updateLanding.isPending}
                className="gap-1.5 rounded-lg"
              >
                {landing.status === "published" ? "Despublicar" : "Publicar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(landing.id, landing.title)}
                disabled={deleteLanding.isPending}
                className="h-8 w-8 rounded-lg p-0 text-rose-400 hover:text-rose-300"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
