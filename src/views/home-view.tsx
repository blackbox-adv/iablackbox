"use client";

import { useHome } from "@/hooks/use-blackbox";
import { useAppStore } from "@/lib/store";
import { CATEGORIES } from "@/lib/constants";
import { HeroSearch } from "@/components/blackbox/hero-search";
import { ProductCard } from "@/components/blackbox/product-card";
import { ProductGridSkeleton } from "@/components/blackbox/skeletons";
import { Button } from "@/components/ui/button";
import { ArrowRight, Flame, Sparkles, TrendingUp, LayoutGrid, GitCompare } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  offers: Flame,
  categories: LayoutGrid,
  ai_recommendations: Sparkles,
  comparator: GitCompare,
};

export function HomeView() {
  const { data, isLoading } = useHome();
  const goSearch = useAppStore((s) => s.goSearch);
  const goCompare = useAppStore((s) => s.goCompare);

  const sections = data?.sections?.filter((s) => s.isActive) ?? [];

  return (
    <div>
      <HeroSearch />

      <div className="mx-auto max-w-7xl px-4 pb-20">
        {isLoading ? (
          <div className="space-y-16">
            <SkeletonSection title="Ofertas destacadas" />
            <SkeletonSection title="Recomendados por IA" />
          </div>
        ) : (
          <div className="space-y-20">
            {sections.map((section) => {
              if (section.type === "offers") {
                const items = data?.featured ?? [];
                if (!items.length) return null;
                return (
                  <SectionWrap key={section.id} title={section.title} subtitle={section.subtitle} icon={Flame} accent="emerald">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                      {items.map((p, i) => (
                        <ProductCard key={p.id} product={p} index={i} />
                      ))}
                    </div>
                  </SectionWrap>
                );
              }

              if (section.type === "categories") {
                return (
                  <SectionWrap key={section.id} title={section.title} subtitle={section.subtitle} icon={LayoutGrid} accent="lime">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                      {CATEGORIES.map((cat) => {
                        const Icon =
                          (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[cat.icon] ??
                          LucideIcons.Box;
                        return (
                          <button
                            key={cat.key}
                            onClick={() => goSearch(cat.label)}
                            className={cn(
                              "group relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-border/50 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-float",
                              `bg-gradient-to-br ${cat.gradient}`
                            )}
                          >
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl glass-strong transition-transform duration-300 group-hover:scale-110">
                              <Icon className="h-7 w-7 text-foreground" />
                            </span>
                            <span className="text-sm font-semibold">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </SectionWrap>
                );
              }

              if (section.type === "ai_recommendations") {
                const items = data?.recommendations ?? [];
                if (!items.length) return null;
                return (
                  <SectionWrap key={section.id} title={section.title} subtitle={section.subtitle} icon={TrendingUp} accent="emerald">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3">
                      {items.map((p, i) => (
                        <ProductCard key={p.id} product={p} index={i} />
                      ))}
                    </div>
                  </SectionWrap>
                );
              }

              if (section.type === "comparator") {
                return (
                  <SectionWrap key={section.id} title={section.title} subtitle={section.subtitle} icon={GitCompare} accent="amber">
                    <div className="relative overflow-hidden rounded-3xl border border-border/50 glass p-8 text-center sm:p-12">
                      <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-80 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[80px]" />
                      <div className="relative">
                        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl glass-strong">
                          <GitCompare className="h-8 w-8 text-emerald-400" />
                        </span>
                        <h3 className="text-xl font-semibold sm:text-2xl">Compara productos lado a lado</h3>
                        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
                          Selecciona hasta 4 productos y compara precio, calidad, envío, garantía y puntuación IA en una sola vista.
                        </p>
                        <Button onClick={() => goCompare()} className="mt-6 gap-2 rounded-xl shadow-soft transition-all hover:shadow-float">
                          <GitCompare className="h-4 w-4" />
                          Abrir comparador
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </SectionWrap>
                );
              }

              return null;
            })}

            {/* See all */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => goSearch("")} className="gap-2 rounded-full border-border/50 px-6 py-2.5">
                Ver todos los productos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ACCENT_COLORS: Record<string, { ring: string; bg: string }> = {
  emerald: { ring: "text-emerald-400", bg: "bg-emerald-500/10" },
  lime: { ring: "text-lime-400", bg: "bg-lime-500/10" },
  amber: { ring: "text-amber-400", bg: "bg-amber-500/10" },
};

function SectionWrap({
  title,
  subtitle,
  icon: Icon,
  accent = "emerald",
  children,
}: {
  title: string;
  subtitle?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  accent?: keyof typeof ACCENT_COLORS;
  children: React.ReactNode;
}) {
  const ac = ACCENT_COLORS[accent] ?? ACCENT_COLORS.emerald;
  return (
    <section className="animate-fade-up scroll-mt-20">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl glass-strong", ac.ring)}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function SkeletonSection({ title }: { title: string }) {
  return (
    <section>
      <div className="mb-7 flex items-center gap-4">
        <span className="h-11 w-11 animate-shimmer rounded-2xl" />
        <div className="space-y-2">
          <div className="h-6 w-56 animate-shimmer rounded-lg" />
          <div className="h-3 w-72 animate-shimmer rounded" />
        </div>
      </div>
      <ProductGridSkeleton count={4} />
      <p className="sr-only">{title}</p>
    </section>
  );
}
