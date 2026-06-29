"use client";

import { useAppStore } from "@/lib/store";
import { Header } from "@/components/blackbox/header";
import { Footer } from "@/components/blackbox/footer";
import { HomeView } from "@/views/home-view";
import { SearchView } from "@/views/search-view";
import { ProductView } from "@/views/product-view";
import { CompareView } from "@/views/compare-view";
import { AdminView } from "@/views/admin-view";

export default function Home() {
  const view = useAppStore((s) => s.view);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {view.name === "home" && <HomeView />}
        {view.name === "search" && <SearchView key={view.query} query={view.query} />}
        {view.name === "product" && <ProductView key={view.productId} productId={view.productId} />}
        {view.name === "compare" && <CompareView productIds={view.productIds} />}
        {view.name === "admin" && <AdminView />}
      </main>
      <Footer />
    </div>
  );
}
