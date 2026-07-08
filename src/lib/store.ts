// BLACKBOX client navigation store - manages view state + compare list + import
import { create } from "zustand";
import { decodeImportPayload } from "@/lib/bookmarklet";

export interface ImportPayload {
  name: string;
  price: number | null;
  currency: string | null;
  originalPrice: number | null;
  description: string;
  brand: string;
  images: string[];
  category: string;
  sourceUrl: string;
  sourceDomain: string;
}

export type View =
  | { name: "home" }
  | { name: "search"; query: string }
  | { name: "product"; productId: string }
  | { name: "compare"; productIds?: string[] }
  | { name: "admin" }
  | { name: "import-review"; payload: ImportPayload };

interface AppState {
  view: View;
  compareIds: string[];
  // navigation
  goHome: () => void;
  goSearch: (query: string) => void;
  goProduct: (productId: string) => void;
  goCompare: (productIds?: string[]) => void;
  goAdmin: () => void;
  goImportReview: (payload: ImportPayload) => void;
  // compare list
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
}

/**
 * On first load in the browser, check for #import=... hash (set by the
 * bookmarklet). If present, switch to the import-review view.
 */
function getInitialView(): View {
  if (typeof window !== "undefined") {
    const hash = window.location.hash;
    if (hash.startsWith("#import=")) {
      const payload = decodeImportPayload(hash);
      if (payload && payload.name) {
        // Clear the hash so it doesn't re-trigger on refresh
        history.replaceState(null, "", window.location.pathname);
        return { name: "import-review", payload };
      }
    }
  }
  return { name: "home" };
}

export const useAppStore = create<AppState>((set, get) => ({
  view: getInitialView(),
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
  goImportReview: (payload) => {
    set({ view: { name: "import-review", payload } });
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
