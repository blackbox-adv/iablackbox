// BLACKBOX client navigation store - manages view state + compare list
import { create } from "zustand";

export type View =
  | { name: "home" }
  | { name: "search"; query: string }
  | { name: "product"; productId: string }
  | { name: "compare"; productIds?: string[] }
  | { name: "admin" };

interface AppState {
  view: View;
  compareIds: string[];
  // navigation
  goHome: () => void;
  goSearch: (query: string) => void;
  goProduct: (productId: string) => void;
  goCompare: (productIds?: string[]) => void;
  goAdmin: () => void;
  // compare list
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: { name: "home" },
  compareIds: [],

  goHome: () => {
    set({ view: { name: "home" } });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  goSearch: (query) => {
    set({ view: { name: "search", query } });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  goProduct: (productId) => {
    set({ view: { name: "product", productId } });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  goCompare: (productIds) => {
    const ids = productIds ?? get().compareIds;
    set({ view: { name: "compare", productIds: ids } });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  goAdmin: () => {
    set({ view: { name: "admin" } });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },

  toggleCompare: (id) => {
    const cur = get().compareIds;
    if (cur.includes(id)) {
      set({ compareIds: cur.filter((x) => x !== id) });
    } else {
      if (cur.length >= 4) return; // max 4
      set({ compareIds: [...cur, id] });
    }
  },
  clearCompare: () => set({ compareIds: [] }),
  isInCompare: (id) => get().compareIds.includes(id),
}));
