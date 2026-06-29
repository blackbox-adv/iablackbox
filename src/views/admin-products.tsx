"use client";

import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-blackbox";
import { useCategories } from "@/hooks/use-blackbox";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductImage } from "@/components/blackbox/product-image";
import { ProductGridSkeleton } from "@/components/blackbox/skeletons";
import { useAppStore } from "@/lib/store";
import { formatPEN, STORE_LIST, STORES } from "@/lib/constants";
import { Plus, Pencil, Trash2, Search, Loader2, Package } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AdminProducts() {
  const { data, isLoading } = useProducts({ limit: 100 });
  const { data: catData } = useCategories();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const products = data?.products ?? [];
  const filtered = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.category.toLowerCase().includes(q.toLowerCase())
      )
    : products;

  const onNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const onEdit = (p: Product) => {
    setEditing(p);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={onNew} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </DialogTrigger>
          <ProductDialog
            product={editing}
            categories={catData?.categories ?? []}
            onClose={() => setOpen(false)}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <ProductGridSkeleton count={6} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="divide-y divide-border">
            {filtered.map((p) => (
              <ProductRow key={p.id} product={p} onEdit={() => onEdit(p)} />
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No hay productos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRow({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const update = useUpdateProduct();
  const del = useDeleteProduct();
  const goProduct = useAppStore((s) => s.goProduct);
  const best = product.offers?.[0];
  const offersByStore = product.offers ?? [];

  const toggleActive = () => {
    update.mutate({ id: product.id, data: { isActive: !product.isActive } });
  };

  const onDelete = async () => {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    const t = toast.loading("Eliminando…");
    try {
      await del.mutateAsync(product.id);
      toast.success("Producto eliminado", { id: t });
    } catch {
      toast.error("Error al eliminar", { id: t });
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/20">
      <button
        onClick={() => goProduct(product.id)}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30"
      >
        <ProductImage src={product.images?.[0]} alt={product.name} className="h-full w-full" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", !product.isActive && "text-muted-foreground line-through")}>
          {product.name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>
          {product.isViral && <Badge className="text-[10px] bg-amber-500/15 text-amber-300">Viral</Badge>}
          {offersByStore.map((o) => (
            <span key={o.id} className="text-[10px] text-muted-foreground">
              {STORES[o.store as keyof typeof STORES]?.short}: {formatPEN(o.price)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 pr-1">
          <Switch checked={product.isActive} onCheckedChange={toggleActive} />
        </div>
        <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-rose-400 hover:text-rose-300">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ProductDialog({
  product,
  categories,
  onClose,
}: {
  product: Product | null;
  categories: string[];
  onClose: () => void;
}) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? categories[0] ?? "Tecnología");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [images, setImages] = useState((product?.images ?? []).join("\n"));
  const [features, setFeatures] = useState((product?.features ?? []).join("\n"));
  const [isViral, setIsViral] = useState(product?.isViral ?? false);
  // offers
  const [offers, setOffers] = useState(
    product?.offers
      ? product.offers.map((o) => ({
          store: o.store,
          price: String(o.price),
          originalPrice: o.originalPrice ? String(o.originalPrice) : "",
          shippingTime: o.shippingTime,
          availability: o.availability,
          affiliateLink: o.affiliateLink,
        }))
      : STORE_LIST.map((s) => ({ store: s, price: "", originalPrice: "", shippingTime: "1-2 días", availability: "in_stock", affiliateLink: "" }))
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      description,
      category,
      brand: brand || undefined,
      images: images.split("\n").map((s) => s.trim()).filter(Boolean),
      features: features.split("\n").map((s) => s.trim()).filter(Boolean),
      isViral,
    };
    const t = toast.loading(isEdit ? "Guardando…" : "Creando…");
    try {
      if (isEdit && product) {
        await update.mutateAsync({ id: product.id, data: payload });
        toast.success("Producto actualizado", { id: t });
      } else {
        await create.mutateAsync(payload as never);
        toast.success("Producto creado", { id: t });
      }
      onClose();
    } catch (err) {
      toast.error("Error: " + (err as Error).message, { id: t });
    }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...new Set([...categories, "Tecnología", "Audio", "Gaming", "Gadgets virales", "Accesorios móviles"])].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Descripción *</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="images">Imágenes (una URL por línea)</Label>
          <Textarea id="images" value={images} onChange={(e) => setImages(e.target.value)} rows={2} placeholder="https://…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="features">Características (una por línea)</Label>
          <Textarea id="features" value={features} onChange={(e) => setFeatures(e.target.value)} rows={3} />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="viral" checked={isViral} onCheckedChange={setIsViral} />
          <Label htmlFor="viral">Producto viral</Label>
        </div>

        {/* Offers editor */}
        <div className="space-y-2">
          <Label>Ofertas por tienda</Label>
          <div className="space-y-2">
            {offers.map((o, i) => (
              <div key={o.store} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-2 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-xs text-muted-foreground">{STORES[o.store as keyof typeof STORES]?.label}</span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Precio"
                  value={o.price}
                  onChange={(e) => updateOffer(i, "price", e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Precio original"
                  value={o.originalPrice}
                  onChange={(e) => updateOffer(i, "originalPrice", e.target.value)}
                  className="h-8 text-xs"
                />
                <Select
                  value={o.availability}
                  onValueChange={(v) => updateOffer(i, "availability", v)}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">En stock</SelectItem>
                    <SelectItem value="low_stock">Poco stock</SelectItem>
                    <SelectItem value="out_of_stock">Agotado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Las ofertas se actualizan al guardar (edición) o se crean con el producto (nuevo).
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending || update.isPending} className="gap-1.5">
            {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  function updateOffer(i: number, field: string, value: string) {
    setOffers((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  }
}
