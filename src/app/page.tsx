"use client";

import { useAppStore } from "@/lib/store";
import { Header } from "@/components/blackbox/header";
import { Footer } from "@/components/blackbox/footer";
import { HomeView } from "@/views/home-view";
import { SearchView } from "@/views/search-view";
import { ProductView } from "@/views/product-view";
import { CompareView } from "@/views/compare-view";
import { AdminView } from "@/views/admin-view";
import { ImportReviewView } from "@/views/import-review-view";
import { decodeImportPayload } from "@/lib/bookmarklet";
import { useEffect } from "react";

export default function Home() {
  const view = useAppStore((s) => s.view);
  const goImportReview = useAppStore((s) => s.goImportReview);

  // Check for #import= hash (set by the bookmarklet) AFTER mount, because
  // window.location is not available during SSR.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.startsWith("#import=")) {
      const payload = decodeImportPayload(hash);
      if (payload && payload.name) {
        // Clear the hash so it doesn't re-trigger
        history.replaceState(null, "", window.location.pathname);
        goImportReview(payload);
      }
    }
  }, [goImportReview]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {view.name === "home" && <HomeView />}
        {view.name === "search" && <SearchView key={view.query} query={view.query} />}
        {view.name === "product" && <ProductView key={view.productId} productId={view.productId} />}
        {view.name === "compare" && <CompareView productIds={view.productIds} />}
        {view.name === "admin" && <AdminView />}
        {view.name === "import-review" && <ImportReviewView payload={view.payload} />}
      </main>
      <Footer />
    </div>
  );
}
