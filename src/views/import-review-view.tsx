"use client";

import { useCreateProduct, useAiScore } from "@/hooks/use-blackbox";
import { useAppStore, type ImportPayload } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductImage } from "@/components/blackbox/product-image";
import { ArrowLeft, Check, Loader2, Link2, Sparkles, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ImportReviewView({ payload }: { payload: ImportPayload }) {
  const create = useCreateProduct();
  const regenScore = useAiScore();
  const goHome = useAppStore((s) => s.goHome);
  const goProduct = useAppStore((s) => s.goProduct);

  const [name, setName] = useState(payload.name);
  const [price, setPrice] = useState(payload.price != null ? String(payload.price) : "");
  const [brand, setBrand] = useState(payload.brand);
  const [category, setCategory] = useState(payload.category);
  const [description, setDescription] = useState(payload.description);
  const [images, setImages] = useState(payload.images.join("\n"));
  const [sourceUrl] = useState(payload.sourceUrl);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price.trim()) return;
    const t = toast.loading("Guardando producto…");
    try {
      const imgs = images.split("\n").map((s) => s.trim()).filter(Boolean);
      const res = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || `Producto de ${payload.sourceDomain}`,
        category,
        brand: brand.trim() || undefined,
        images: imgs,
        sourceUrl: sourceUrl,
        offer: {
          price: parseFloat(price) || 0,
          affiliateLink: sourceUrl,
          shippingTime: "No disponible",
          availability: "in_stock",
          currency: payload.currency || "PEN",
        },
      } as never);
      toast.success("Producto guardado ✓", { id: t });

      // Auto-generate AI analysis
      toast.info("Generando análisis IA…", { id: "ai-gen" });
      try {
        await regenScore.mutateAsync({ productId: res.product.id });
        toast.success("Análisis IA generado", { id: "ai-gen" });
      } catch {
        toast.error("No se pudo generar el análisis IA ahora", { id: "ai-gen" });
      }
      goProduct(res.product.id);
    } catch (err) {
      toast.error("Error: " + (err as Error).message, { id: t });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button
        onClick={goHome}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </button>

      {/* Success banner */}
      <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Zap className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">¡Datos capturados desde {payload.sourceDomain}!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              El marcador extrajo la información real del producto desde tu navegador.
              Revisa los datos y guarda. El enlace de afiliado se preserva para generar comisión.
            </p>
          </div>
        </div>
      </div>

      {/* Preview image */}
      {payload.images[0] && (
        <div className="mb-6 flex justify-center">
          <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-border bg-muted/30">
            <ProductImage src={payload.images[0]} alt={name} className="h-full w-full" />
          </div>
        </div>
      )}

      <form onSubmit={onSave} className="space-y-4">
        {/* Affiliate link (preserved) */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Enlace de afiliado (preservado ✓)</Label>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="truncate text-xs text-foreground">{sourceUrl}</span>
            <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-400" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ir-name">Nombre del producto *</Label>
          <Input id="ir-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="ir-price">Precio *</Label>
            <Input
              id="ir-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              step="0.01"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ir-brand">Marca</Label>
            <Input id="ir-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ir-cat">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="ir-cat"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Tecnología", "Audio", "Gaming", "Gadgets virales", "Accesorios móviles"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ir-desc">Descripción</Label>
          <Textarea id="ir-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ir-imgs">Imágenes (una URL por línea)</Label>
          <Textarea id="ir-imgs" value={images} onChange={(e) => setImages(e.target.value)} rows={2} />
        </div>

        {/* AI note */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Al guardar, la IA analizará automáticamente el producto y generará:
              resumen, ventajas, desventajas, casos de uso, puntuación y FAQs.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={goHome} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={create.isPending || regenScore.isPending}
            className="flex-1 gap-1.5"
          >
            {create.isPending || regenScore.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
            ) : (
              <><Check className="h-4 w-4" /> Guardar y analizar</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
