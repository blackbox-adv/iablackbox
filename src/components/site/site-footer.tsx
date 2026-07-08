import Link from "next/link";
import { Boxes, ShieldCheck, Sparkles } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                <Boxes className="h-4 w-4 text-black" />
              </span>
              <span className="text-sm font-bold">
                BLACK<span className="text-emerald-400">BOX</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Plataforma inteligente de descubrimiento de ofertas y comparación de productos.
              No vendemos productos: te ayudamos a decidir.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Plataforma
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">Inicio</Link></li>
              <li><Link href="/comparar" className="text-muted-foreground transition-colors hover:text-foreground">Comparador</Link></li>
              <li><Link href="/admin" className="text-muted-foreground transition-colors hover:text-foreground">Control Center</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tiendas afiliadas
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Amazon</li>
              <li>Temu</li>
              <li>Falabella</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cómo funciona
            </h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                Comparamos precios entre tiendas afiliadas
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                La IA puntúa cada producto de 0 a 100
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                Redirigimos con links de afiliado
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/40 pt-4 text-[11px] text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} BLACKBOX. No es una tienda. Solo afiliados + recomendación + comparación.</p>
          <p>Hecho con IA · Precios referenciales</p>
        </div>
      </div>
    </footer>
  );
}
