"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // next-themes handles SSR — theme is undefined on server, set on client.
  // We render a stable placeholder until hydrated to avoid mismatch.
  const isDark = theme === "dark";
  const mounted = typeof window !== "undefined" && theme !== undefined;

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card/40 text-foreground/70 backdrop-blur-sm transition-all hover:border-foreground/20 hover:bg-card/60 hover:text-foreground",
        className
      )}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      suppressHydrationWarning
    >
      {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
