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

      <div className="mx-auto max-w-7xl px-4 pb-16">
        {isLoading ? (
          <div className="space-y-12">
            <SkeletonSection title="Ofertas destacadas" />
            <SkeletonSection title="Recomendados por IA" />
          </div>
        ) : (
          <div className="space-y-14">
            {sections.map((section) => {
              if (section.type === "offers") {
                const items = data?.featured ?? [];
                if (!items.length) return null;
                return (
                  <SectionWrap key={section.id} title={section.title} subtitle={section.subtitle} icon={Flame}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                      {items.map((p, i) => (
                        <ProductCard key={p.id} product={p} index={i} />
                      ))}
                    </div>
                  </SectionWrap>
                );
              }

              if (section.type === "categories") {
                return (
                  <SectionWrap key={section.id} title={section.title} subtitle={section.subtitle} icon={LayoutGrid}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {CATEGORIES.map((cat) => {
                        const Icon =
                          (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[cat.icon] ??
                          LucideIcons.Box;
                        return (
                          <button
                            key={cat.key}
                            onClick={() => goSearch(cat.label)}
                            className={`group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${cat.gradient} p-5 text-center transition-all hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lg hover:shadow-black/20`}
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/60 backdrop-blur transition-transform group-hover:scale-110">
                              <Icon className="h-6 w-6 text-foreground" />
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
                  <SectionWrap key={section.id} title={section.title} subtitle={section.subtitle} icon={TrendingUp}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3">
                      {items.map((p, i) => (
                        <ProductCard key={p.id} product={p} index={i} />
                      ))}
                    </div>
                  </SectionWrap>
                );
              }

              if (section.type === "comparator") {
                return (
                  <SectionWrap key={section.id} title={section.title} subtitle={section.subtitle} icon={GitCompare}>
                    <div className="rounded-2xl border border-border bg-card/40 p-6 text-center">
                      <p className="mx-auto max-w-md text-sm text-muted-foreground">
                        Selecciona hasta 4 productos y compáralos lado a lado: precio, calidad,
                        envío, garantía y puntuación IA.
                      </p>
                      <Button onClick={() => goCompare()} className="mt-4 gap-2">
                        <GitCompare className="h-4 w-4" />
                        Abrir comparador
                      </Button>
                    </div>
                  </SectionWrap>
                );
              }

              return null;
            })}

            {/* See all */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => goSearch("")} className="gap-2 rounded-full">
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

function SectionWrap({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-up">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
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
      <div className="mb-5 flex items-center gap-3">
        <span className="h-9 w-9 animate-shimmer rounded-xl" />
        <div className="h-6 w-48 animate-shimmer rounded" />
      </div>
      <ProductGridSkeleton count={4} />
      <p className="sr-only">{title}</p>
    </section>
  );
}
