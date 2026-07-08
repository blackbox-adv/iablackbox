"use client";

import { buildBookmarklet } from "@/lib/bookmarklet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bookmark, Zap, MousePointerClick, CheckCircle2, Copy } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export function AdminBookmarklet() {
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "https://tu-blackbox.com"
  );
  const bookmarklet = useMemo(() => buildBookmarklet(origin), [origin]);

  const copyBookmarklet = () => {
    navigator.clipboard
      .writeText(bookmarklet)
      .then(() => toast.success("Marcador copiado al portapapeles"))
      .catch(() => toast.error("No se pudo copiar"));
  };

  return (
    <div className="space-y-4">
      {/* What is this */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bookmark className="h-4 w-4 text-primary" />
            Marcador mágico — el método más fácil
          </CardTitle>
          <CardDescription>
            Importa productos con UN CLIC desde cualquier tienda. Sin scraping, sin
            bloqueos, sin fotos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm text-foreground">
              <strong>¿Por qué funciona cuando el scraping falla?</strong>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              El marcador se ejecuta en <strong>tu navegador real</strong>, donde la
              página ya está renderizada y no te bloquean. Extrae los datos del
              producto directamente y los envía a BLACKBOX.
            </p>
          </div>

          {/* The bookmarklet link */}
          <div className="space-y-2">
            <p className="text-sm font-medium">1. Arrastra este enlace a tu barra de marcadores:</p>
            <div className="flex items-center gap-2">
              <a
                href={bookmarklet}
                onClick={(e) => e.preventDefault()}
                draggable
                className="flex flex-1 cursor-grab items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/15 active:cursor-grabbing"
                title="Arrástrame a la barra de marcadores"
              >
                <Bookmark className="h-4 w-4" />
                ➕ Agregar a BLACKBOX
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">arrastra →</span>
              </a>
              <button
                onClick={copyBookmarklet}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card/40 text-muted-foreground transition-colors hover:text-foreground"
                title="Copiar"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Si no puedes arrastrar: copia el link, crea un marcador nuevo manualmente
              y pégalo como URL.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <p className="text-sm font-medium">2. Cómo usarlo:</p>
            <div className="space-y-2">
              <Step
                num="A"
                icon={MousePointerClick}
                title="Abre un producto en Temu, Amazon o Falabella"
                desc="Navega normalmente a la página del producto que quieres agregar."
              />
              <Step
                num="B"
                icon={Zap}
                title="Haz clic en el marcador 'Agregar a BLACKBOX'"
                desc="El marcador lee todos los datos del producto (nombre, precio, imágenes, descripción)."
              />
              <Step
                num="C"
                icon={CheckCircle2}
                title="Revisa y guarda en BLACKBOX"
                desc="Se abre BLACKBOX con todo pre-llenado. Revisas, guardas, y la IA analiza automáticamente."
              />
            </div>
          </div>

          {/* Why this is better */}
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">✅ Ventajas vs. otros métodos:</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• <strong>Funciona con Temu</strong> (que bloquea todos los scrapers)</li>
              <li>• <strong>No necesitas tomar capturas</strong> ni subir fotos</li>
              <li>• <strong>Un solo clic</strong> — más rápido que el ingreso manual</li>
              <li>• <strong>El enlace de afiliado se guarda automáticamente</strong> (es la URL donde estás)</li>
              <li>• <strong>La IA analiza al guardar</strong> — generando ventajas, desventajas, score, FAQs</li>
            </ul>
          </div>

          <p className="text-[11px] text-muted-foreground">
            URL de tu BLACKBOX: <code className="rounded bg-muted/40 px-1.5 py-0.5">{origin}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({
  num,
  icon: Icon,
  title,
  desc,
}: {
  num: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card/40 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
        {num}
      </span>
      <div className="flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
