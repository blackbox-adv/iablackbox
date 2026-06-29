"use client";

import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useImportProduct,
  useRefreshProduct,
  useBulkRefresh,
  useToggleFeature,
  useCategories,
} from "@/hooks/use-blackbox";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Package,
  Link2,
  RefreshCw,
  Star,
  CheckSquare,
  Sparkles,
  Globe,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AdminProducts() {
  const { data, isLoading } = useProducts({ limit: 200 });
  const { data: catData } = useCategories();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulkRefresh = useBulkRefresh();

  const products = data?.products ?? [];
  const filtered = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.category.toLowerCase().includes(q.toLowerCase())
      )
    : products;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onBulkRefresh = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const t = toast.loading(`Actualizando ${ids.length} producto(s)… esto puede tardar`);
    try {
      const res = await bulkRefresh.mutateAsync(ids);
      const ok = res.results.filter((r) => r.success).length;
      const fail = res.results.length - ok;
      toast.success(`${ok} actualizado(s)${fail ? ` · ${fail} fallaron` : ""}`, { id: t });
      setSelected(new Set());
    } catch {
      toast.error("Error en la actualización masiva", { id: t });
    }
  };

  return (
    <div className="space-y-4">
      {/* Import + search + bulk actions */}
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
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              onClick={onBulkRefresh}
              disabled={bulkRefresh.isPending}
              variant="outline"
              className="gap-1.5"
            >
              {bulkRefresh.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Actualizar {selected.size}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setManualOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Crear manualmente
          </Button>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Link2 className="h-4 w-4" />
                Importar producto
              </Button>
            </DialogTrigger>
            <ImportDialog onClose={() => setImportOpen(false)} />
          </Dialog>
        </div>
      </div>

      {/* Bulk select hint */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="font-medium">{selected.size} seleccionado(s)</span>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Limpiar selección
          </button>
        </div>
      )}

      {isLoading ? (
        <ProductGridSkeleton count={6} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="divide-y divide-border">
            {filtered.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onEdit={() => {
                  setEditing(p);
                  setEditOpen(true);
                }}
                selected={selected.has(p.id)}
                onToggleSelect={() => toggleSelect(p.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {products.length === 0
                    ? "Aún no hay productos. Importa el primero con un enlace de afiliado."
                    : "Sin resultados para tu búsqueda."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit dialog (separate from import) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditProductForm
              product={editing}
              categories={catData?.categories ?? []}
              onClose={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Manual create dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Crear producto manualmente
            </DialogTitle>
          </DialogHeader>
          <ManualProductForm
            categories={catData?.categories ?? []}
            onClose={() => setManualOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Import dialog ----------
function ImportDialog({ onClose }: { onClose: () => void }) {
  const importMut = useImportProduct();
  const goProduct = useAppStore((s) => s.goProduct);
  const [url, setUrl] = useState("");

  const onImport = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const t = toast.loading("Importando producto real… (scraping + análisis IA)");
    try {
      const res = await importMut.mutateAsync({ url: url.trim() });
      toast.success("Producto importado y analizado con IA", { id: t });
      onClose();
      setUrl("");
      goProduct(res.product.id);
    } catch (err) {
      toast.error("Error al importar: " + (err as Error).message, { id: t });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Importar producto real
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={onImport} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="import-url">Enlace de afiliado del producto *</Label>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="import-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.amazon.com/dp/B0… o Temu / Falabella"
              className="pl-9"
              required
              type="url"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Pega el enlace de Amazon, Temu, Falabella u otra tienda. BLACKBOX
            obtendrá los datos reales del producto y la IA lo analizará.
          </p>
        </div>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">¿Qué se obtiene automáticamente?</p>
              <p className="mt-1">
                Nombre, descripción, imágenes, precio, precio anterior, valoración,
                reseñas, envío, marca y especificaciones (según disponibilidad).
                Luego la IA genera: resumen, ventajas, desventajas, casos de uso,
                puntuación y FAQs.
              </p>
              <p className="mt-2 font-medium text-amber-300">⚠ Si un dato no existe, se mostrará “No disponible”. Nunca se inventan datos.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={importMut.isPending} className="gap-1.5">
            {importMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando…
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Importar y analizar
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

// ---------- Product row ----------
function ProductRow({
  product,
  onEdit,
  selected,
  onToggleSelect,
}: {
  product: Product;
  onEdit: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const update = useUpdateProduct();
  const del = useDeleteProduct();
  const refresh = useRefreshProduct();
  const toggleFeature = useToggleFeature();
  const goProduct = useAppStore((s) => s.goProduct);
  const best = product.offers?.[0];

  const toggleActive = () => {
    update.mutate({ id: product.id, data: { isActive: !product.isActive } });
  };

  const onFeature = () => {
    toggleFeature.mutate({ id: product.id, isFeatured: !product.isFeatured });
  };

  const onRefresh = async () => {
    if (!product.sourceUrl) {
      toast.error("Este producto no tiene URL de origen para actualizar");
      return;
    }
    const t = toast.loading("Actualizando datos reales…");
    try {
      await refresh.mutateAsync(product.id);
      toast.success("Producto actualizado y re-analizado", { id: t });
    } catch (err) {
      toast.error("Error: " + (err as Error).message, { id: t });
    }
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
      <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label="Seleccionar" />
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
          {product.isFeatured && <Badge className="gap-1 text-[10px] bg-amber-500/15 text-amber-300"><Star className="h-2.5 w-2.5" />Destacado</Badge>}
          {product.sourceStore && (
            <Badge variant="outline" className="text-[10px]">{STORES[product.sourceStore as keyof typeof STORES]?.label ?? product.sourceStore}</Badge>
          )}
          {best && (
            <span className="text-[10px] text-muted-foreground">
              {formatPEN(best.price)}
            </span>
          )}
        </div>
        {product.sourceUrl && (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={product.sourceUrl}>
            <Link2 className="mr-1 inline h-2.5 w-2.5" />
            {product.sourceUrl}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {product.sourceUrl && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onRefresh}
            disabled={refresh.isPending}
            className="h-8 w-8"
            title="Actualizar información"
          >
            {refresh.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={onFeature}
          className={cn("h-8 w-8", product.isFeatured && "text-amber-400 hover:text-amber-300")}
          title={product.isFeatured ? "Quitar destacado" : "Destacar en portada"}
        >
          <Star className={cn("h-4 w-4", product.isFeatured && "fill-amber-400")} />
        </Button>
        <div className="flex items-center gap-1.5 px-1">
          <Switch checked={product.isActive} onCheckedChange={toggleActive} />
        </div>
        <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8" title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-rose-400 hover:text-rose-300" title="Eliminar">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------- Edit form (manual edit) ----------
function EditProductForm({
  product,
  categories,
  onClose,
}: {
  product: Product;
  categories: string[];
  onClose: () => void;
}) {
  const update = useUpdateProduct();

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [category, setCategory] = useState(product.category);
  const [brand, setBrand] = useState(product.brand ?? "");
  const [images, setImages] = useState((product.images ?? []).join("\n"));
  const [features, setFeatures] = useState((product.features ?? []).join("\n"));
  const [isViral, setIsViral] = useState(product.isViral);
  const [affiliateLink, setAffiliateLink] = useState(bestOffer(product)?.affiliateLink ?? "");

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
    const t = toast.loading("Guardando…");
    try {
      await update.mutateAsync({ id: product.id, data: payload });
      toast.success("Producto actualizado", { id: t });
      onClose();
    } catch (err) {
      toast.error("Error: " + (err as Error).message, { id: t });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
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
        <Label htmlFor="desc">Descripción</Label>
        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="images">Imágenes (una URL por línea)</Label>
        <Textarea id="images" value={images} onChange={(e) => setImages(e.target.value)} rows={2} placeholder="https://…" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="features">Características (una por línea)</Label>
        <Textarea id="features" value={features} onChange={(e) => setFeatures(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="link">Enlace de afiliado</Label>
        <Input id="link" value={affiliateLink} onChange={(e) => setAffiliateLink(e.target.value)} placeholder="https://…" />
        <p className="text-[11px] text-muted-foreground">Edita el link de la mejor oferta si es necesario.</p>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="viral" checked={isViral} onCheckedChange={setIsViral} />
        <Label htmlFor="viral">Producto viral</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={update.isPending} className="gap-1.5">
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

function bestOffer(p: Product) {
  if (!p.offers?.length) return null;
  return [...p.offers].sort((a, b) => a.price - b.price)[0];
}

// ---------- Manual product form ----------
function ManualProductForm({
  categories,
  onClose,
}: {
  categories: string[];
  onClose: () => void;
}) {
  const create = useCreateProduct();
  const goProduct = useAppStore((s) => s.goProduct);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Tecnología");
  const [brand, setBrand] = useState("");
  const [images, setImages] = useState("");
  const [features, setFeatures] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isViral, setIsViral] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    const t = toast.loading("Creando producto…");
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        brand: brand.trim() || undefined,
        images: images.split("\n").map((s) => s.trim()).filter(Boolean),
        features: features.split("\n").map((s) => s.trim()).filter(Boolean),
        isViral,
        sourceUrl: sourceUrl.trim() || undefined,
      };
      const res = await create.mutateAsync(payload as never);
      toast.success("Producto creado", { id: t });
      onClose();
      goProduct(res.product.id);
    } catch (err) {
      toast.error("Error: " + (err as Error).message, { id: t });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Ingreso manual</p>
        <p className="mt-1">
          Usa este formulario cuando la importación automática no funcione (la tienda
          bloquea lectores automáticos). Ingresa los datos que veas en la página del
          producto. La IA los analizará después con "Recalcular IA".
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="m-name">Nombre *</Label>
        <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="m-cat">Categoría</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="m-cat"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...new Set([...categories, "Tecnología", "Audio", "Gaming", "Gadgets virales", "Accesorios móviles"])].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-brand">Marca</Label>
          <Input id="m-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="m-desc">Descripción *</Label>
        <Textarea id="m-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="m-imgs">Imágenes (una URL por línea)</Label>
        <Textarea id="m-imgs" value={images} onChange={(e) => setImages(e.target.value)} rows={2} placeholder="https://…" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="m-feat">Características (una por línea)</Label>
        <Textarea id="m-feat" value={features} onChange={(e) => setFeatures(e.target.value)} rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="m-src">URL de origen (enlace de afiliado del producto)</Label>
        <Input id="m-src" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://www.temu.com/… o https://www.amazon.com/dp/…" type="url" />
        <p className="text-[11px] text-muted-foreground">
          Pega aquí el enlace exacto del producto. Así el botón "Ver oferta" llevará
          directo al producto, y "Actualizar información" intentará re-obtener los datos.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="m-viral" checked={isViral} onCheckedChange={setIsViral} />
        <Label htmlFor="m-viral">Producto viral</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={create.isPending} className="gap-1.5">
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Crear producto
        </Button>
      </DialogFooter>
    </form>
  );
}

// keep import to avoid tree-shake warnings if STORE_LIST used elsewhere later
void STORE_LIST;
