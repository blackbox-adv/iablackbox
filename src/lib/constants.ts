// BLACKBOX constants: store metadata, categories, classification config, formatting
import type { Classification, Store } from "./types";

export const STORES: Record<
  Store,
  { label: string; short: string; color: string; badge: string; domain: string }
> = {
  amazon: {
    label: "Amazon",
    short: "AMZ",
    color: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    domain: "amazon.com",
  },
  temu: {
    label: "Temu",
    short: "TEMU",
    color: "text-orange-400",
    badge: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    domain: "temu.com",
  },
  falabella: {
    label: "Falabella",
    short: "FALA",
    color: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    domain: "falabella.com.pe",
  },
};

export const STORE_LIST: Store[] = ["amazon", "temu", "falabella"];

export interface CategoryMeta {
  key: string;
  label: string;
  icon: string; // lucide icon name
  gradient: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "Tecnología", label: "Tecnología", icon: "Smartphone", gradient: "from-violet-500/20 to-fuchsia-500/10" },
  { key: "Audio", label: "Audio", icon: "Headphones", gradient: "from-cyan-500/20 to-sky-500/10" },
  { key: "Gaming", label: "Gaming", icon: "Gamepad2", gradient: "from-rose-500/20 to-pink-500/10" },
  { key: "Gadgets virales", label: "Gadgets virales", icon: "Sparkles", gradient: "from-amber-500/20 to-orange-500/10" },
  { key: "Accesorios móviles", label: "Accesorios móviles", icon: "BatteryCharging", gradient: "from-emerald-500/20 to-teal-500/10" },
];

export interface ClassificationMeta {
  key: Classification;
  label: string;
  emoji: string;
  badge: string;
  ring: string;
  scoreColor: string;
}

export const CLASSIFICATIONS: Record<Classification, ClassificationMeta> = {
  excellent: {
    key: "excellent",
    label: "Excelente compra",
    emoji: "🔥",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    ring: "ring-emerald-500/40",
    scoreColor: "text-emerald-400",
  },
  good: {
    key: "good",
    label: "Buena compra",
    emoji: "👍",
    badge: "bg-lime-500/15 text-lime-300 border-lime-500/30",
    ring: "ring-lime-500/40",
    scoreColor: "text-lime-400",
  },
  regular: {
    key: "regular",
    label: "Regular",
    emoji: "⚠",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    ring: "ring-amber-500/40",
    scoreColor: "text-amber-400",
  },
  not_recommended: {
    key: "not_recommended",
    label: "No recomendable",
    emoji: "❌",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    ring: "ring-rose-500/40",
    scoreColor: "text-rose-400",
  },
};

export function classificationFromScore(score: number): Classification {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "regular";
  return "not_recommended";
}

// Offer badge based on discount & price relative to other stores
export function offerBadge(
  price: number,
  minPrice: number,
  hasDiscount: boolean
): { emoji: string; label: string; className: string } {
  if (price === minPrice) {
    return {
      emoji: "🔥",
      label: "Mejor precio",
      className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    };
  }
  if (hasDiscount) {
    return {
      emoji: "🔥",
      label: "Buena oferta",
      className: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    };
  }
  if (price > minPrice * 1.2) {
    return {
      emoji: "⏳",
      label: "Esperar mejor precio",
      className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    };
  }
  return {
    emoji: "⚠",
    label: "Precio normal",
    className: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  };
}

export function discountPercent(price: number, original?: number | null): number | null {
  if (!original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
}

export function formatPEN(value: number): string {
  return `S/${value.toFixed(2)}`;
}

export function availabilityLabel(av: string): { label: string; className: string } {
  switch (av) {
    case "in_stock":
      return { label: "En stock", className: "text-emerald-400" };
    case "low_stock":
      return { label: "Poco stock", className: "text-amber-400" };
    case "out_of_stock":
      return { label: "Agotado", className: "text-rose-400" };
    default:
      return { label: av, className: "text-zinc-400" };
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export const AI_TONES: { key: string; label: string; desc: string }[] = [
  { key: "simple", label: "Simple", desc: "Claro y directo, sin tecnicismos" },
  { key: "tecnico", label: "Técnico", desc: "Incluye especificaciones y datos" },
  { key: "vendedor", label: "Vendedor", desc: "Persuasivo, enfoca en beneficios" },
  { key: "neutral", label: "Neutral", desc: "Objetivo, solo hechos" },
];
