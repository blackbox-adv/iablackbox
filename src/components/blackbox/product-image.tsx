"use client";

import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-zinc-800/60 to-zinc-900/60",
          className
        )}
      >
        <Package className="h-10 w-10 text-zinc-600" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("object-cover", className)}
      onError={(e) => {
        const t = e.currentTarget;
        t.style.display = "none";
        const parent = t.parentElement;
        if (parent && !parent.querySelector(".img-fallback")) {
          const div = document.createElement("div");
          div.className =
            "img-fallback absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800/60 to-zinc-900/60";
          div.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-600"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';
          parent.appendChild(div);
        }
      }}
    />
  );
}
