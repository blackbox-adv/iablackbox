"use client";

import { useEffect, useState } from "react";

const COMPARE_KEY = "bb-compare-ids";

/** Read the compare list count from localStorage (shared across SPA + SSR pages). */
export function useCompareCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(COMPARE_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        setCount(Array.isArray(ids) ? ids.length : 0);
      } catch {
        setCount(0);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("bb-compare-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("bb-compare-changed", read);
    };
  }, []);

  return count;
}

/** Get the full compare IDs array (for the compare page). */
export function useCompareIds(): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(COMPARE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        setIds(Array.isArray(arr) ? arr : []);
      } catch {
        setIds([]);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("bb-compare-changed", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("bb-compare-changed", read);
    };
  }, []);

  return ids;
}

/** Toggle a product in the compare list (persists to localStorage). */
export function toggleCompare(id: string): string[] {
  let ids: string[] = [];
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    ids = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ids)) ids = [];
  } catch {
    ids = [];
  }
  if (ids.includes(id)) {
    ids = ids.filter((x) => x !== id);
  } else {
    if (ids.length >= 4) return ids;
    ids = [...ids, id];
  }
  localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("bb-compare-changed"));
  return ids;
}

/** Check if a product is in the compare list. */
export function isInCompare(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) && ids.includes(id);
  } catch {
    return false;
  }
}
