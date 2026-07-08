"use client";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/40 glass">
      <div className="aspect-square animate-shimmer" />
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="h-4 w-3/4 animate-shimmer rounded" />
          <div className="h-10 w-10 animate-shimmer rounded-full" />
        </div>
        <div className="h-3 w-1/2 animate-shimmer rounded" />
        <div className="mt-2 h-7 w-1/3 animate-shimmer rounded" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
