"use client";

import { useAdminAffiliates, useUpsertAffiliate, useAiSettings, useUpdateAiSettings } from "@/hooks/use-blackbox";
import { STORES, STORE_LIST, AI_TONES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AdminProducts } from "./admin-products";
import { AdminHomeEditor } from "./admin-home-editor";
import { AdminBookmarklet } from "./admin-bookmarklet";
import { Package, LayoutGrid, Link2, Sparkles, Save, Loader2, ShieldCheck, Bookmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AdminView() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-black shadow-lg shadow-emerald-500/20">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            BLACKBOX <span className="text-emerald-400">Control Center</span>
          </h1>
          <p className="text-sm text-muted-foreground">Panel maestro sin código</p>
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
          <TabsTrigger value="products" className="gap-1.5">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Productos</span>
          </TabsTrigger>
          <TabsTrigger value="bookmarklet" className="gap-1.5">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Marcador</span>
          </TabsTrigger>
          <TabsTrigger value="home" className="gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </TabsTrigger>
          <TabsTrigger value="affiliates" className="gap-1.5">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Afiliados</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <AdminProducts />
        </TabsContent>
        <TabsContent value="bookmarklet" className="mt-6">
          <AdminBookmarklet />
        </TabsContent>
        <TabsContent value="home" className="mt-6">
          <AdminHomeEditor />
        </TabsContent>
        <TabsContent value="affiliates" className="mt-6">
          <AdminAffiliates />
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
          <AdminAiSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminAffiliates() {
  const { data, isLoading } = useAdminAffiliates();
  const upsert = useUpsertAffiliate();
  const affiliates = data?.affiliates ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Gestiona los parámetros de afiliado para cada tienda.
      </p>
      {STORE_LIST.map((storeKey) => {
        const aff = affiliates.find((a) => a.store === storeKey);
        const storeMeta = STORES[storeKey];
        return (
          <AffiliateCard
            key={storeKey}
            storeKey={storeKey}
            label={storeMeta.label}
            existing={aff}
            onSave={async (baseUrl, tagParam, tagValue) => {
              const t = toast.loading("Guardando…");
              try {
                await upsert.mutateAsync({
                  id: aff?.id,
                  store: storeKey,
                  baseUrl,
                  tagParam,
                  tagValue,
                });
                toast.success("Afiliado guardado", { id: t });
              } catch {
                toast.error("Error al guardar", { id: t });
              }
            }}
          />
        );
      })}
    </div>
  );
}

function AffiliateCard({
  storeKey,
  label,
  existing,
  onSave,
}: {
  storeKey: string;
  label: string;
  existing?: { id: string; baseUrl: string; tagParam: string | null; tagValue: string | null; isActive: boolean };
  onSave: (baseUrl: string, tagParam: string, tagValue: string) => void;
}) {
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "");
  const [tagParam, setTagParam] = useState(existing?.tagParam ?? "");
  const [tagValue, setTagValue] = useState(existing?.tagValue ?? "");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={STORES[storeKey as keyof typeof STORES]?.color ?? ""}>{label}</span>
        </CardTitle>
        <CardDescription>Dominio y tag de afiliado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs">Base URL</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…" className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Parámetro</Label>
            <Input value={tagParam} onChange={(e) => setTagParam(e.target.value)} placeholder="tag" className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor del tag</Label>
            <Input value={tagValue} onChange={(e) => setTagValue(e.target.value)} placeholder="blackbox-21" className="text-xs" />
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => onSave(baseUrl, tagParam, tagValue)}
          disabled={upsertDisabled(baseUrl) || upsert.isPending}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          Guardar
        </Button>
      </CardContent>
    </Card>
  );

  function upsertDisabled(b: string) {
    return !b.trim();
  }
}

function AdminAiSettings() {
  const { data, isLoading } = useAiSettings();
  const update = useUpdateAiSettings();
  const settings = data?.settings ?? {};
  const [tone, setTone] = useState(settings.ai_tone ?? "simple");
  const [enabled, setEnabled] = useState(settings.ai_enabled === "true");
  const [freshness, setFreshness] = useState(settings.scrape_freshness_hours ?? "24");
  // AI provider config
  const [provider, setProvider] = useState(settings.ai_provider ?? "z-ai");
  const [apiKey, setApiKey] = useState(settings.ai_api_key ?? "");
  const [model, setModel] = useState(settings.ai_model ?? "gemini-2.0-flash");
  const [showKey, setShowKey] = useState(false);

  // sync once loaded
  const [synced, setSynced] = useState(false);
  if (!synced && data) {
    setTone(settings.ai_tone ?? "simple");
    setEnabled(settings.ai_enabled === "true");
    setFreshness(settings.scrape_freshness_hours ?? "24");
    setProvider(settings.ai_provider ?? "z-ai");
    setApiKey(settings.ai_api_key ?? "");
    setModel(settings.ai_model ?? "gemini-2.0-flash");
    setSynced(true);
  }

  const save = async () => {
    const t = toast.loading("Guardando…");
    try {
      await update.mutateAsync({
        ai_tone: tone,
        ai_enabled: String(enabled),
        scrape_freshness_hours: freshness,
        ai_provider: provider,
        ai_api_key: apiKey,
        ai_model: model,
      });
      toast.success("Configuración de IA guardada", { id: t });
    } catch {
      toast.error("Error al guardar", { id: t });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Provider config — NEW */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Proveedor de IA
          </CardTitle>
          <CardDescription>
            Elige qué IA usa BLACKBOX. Puedes usar la IA incluida o tu propia API key de Gemini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider selector */}
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => setProvider("z-ai")}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                provider === "z-ai"
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-card/40 hover:border-foreground/20"
              }`}
            >
              <span className="text-sm font-semibold">IA incluida (z-ai)</span>
              <span className="text-xs text-muted-foreground">Sin configuración. Lista para usar.</span>
            </button>
            <button
              onClick={() => setProvider("gemini")}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                provider === "gemini"
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-card/40 hover:border-foreground/20"
              }`}
            >
              <span className="text-sm font-semibold">Google Gemini (tu API key)</span>
              <span className="text-xs text-muted-foreground">Usa tu propia cuenta y cuota de Gemini.</span>
            </button>
          </div>

          {/* Gemini-specific fields */}
          {provider === "gemini" && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs">API key de Gemini *</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="pr-16 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? "Ocultar" : "Ver"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Consíguela gratis en{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Google AI Studio
                  </a>
                  . Se guarda solo en tu base de datos.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo</Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gemini-2.0-flash"
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Modelos recomendados: <code>gemini-2.0-flash</code> (rápido),
                  <code> gemini-2.5-flash</code>, <code>gemini-1.5-flash</code>.
                </p>
              </div>
            </div>
          )}
          {provider === "z-ai" && (
            <p className="rounded-lg bg-emerald-500/5 p-3 text-xs text-muted-foreground">
              ✓ Usando la IA incluida. No necesitas configurar nada. Cambia a Gemini si quieres usar tu propia cuenta.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Estilo de IA
          </CardTitle>
          <CardDescription>Cómo la IA te habla al recomendar productos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {AI_TONES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTone(t.key)}
                className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all ${
                  tone === t.key
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-card/40 hover:border-foreground/20"
                }`}
              >
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.desc}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Motor de IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">IA activada</p>
              <p className="text-xs text-muted-foreground">Genera scores y recomendaciones</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Freshness de scraping (horas)</Label>
            <Input
              type="number"
              value={freshness}
              onChange={(e) => setFreshness(e.target.value)}
              className="max-w-[120px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Si un producto fue actualizado hace menos de este tiempo, no se vuelve a scrapear.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={update.isPending} className="gap-1.5">
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar configuración
      </Button>
    </div>
  );
}
