"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "bb-admin-token";

export function AdminSecurity() {
  // Lazy init from localStorage — avoids setState-in-effect.
  // On SSR localStorage doesn't exist, so we default to empty.
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) || "";
  });
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(STORAGE_KEY);
  });

  // No effect needed — lazy init handles it.

  const onSave = () => {
    if (!token.trim()) {
      toast.error("El token no puede estar vacío");
      return;
    }
    localStorage.setItem(STORAGE_KEY, token.trim());
    setSaved(true);
    toast.success("Token de admin guardado ✓");
  };

  const onClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken("");
    setSaved(false);
    toast.info("Token eliminado");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Token de administrador
          </CardTitle>
          <CardDescription>
            Protege las acciones del panel (crear/editar productos, landings, configuración).
            Debe coincidir con la variable <code className="rounded bg-muted/40 px-1 py-0.5 text-xs">ADMIN_TOKEN</code> de Vercel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {saved ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-foreground">Token configurado y activo</span>
              <code className="ml-auto text-xs text-muted-foreground">{token.slice(0, 4)}••••••</code>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-foreground">Sin token configurado — el panel funciona en modo desarrollo, pero en producción necesitas el token.</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-token">Token de admin</Label>
            <Input
              id="admin-token"
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setSaved(false);
              }}
              placeholder="Pega aquí tu ADMIN_TOKEN de Vercel"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Genera un secreto aleatorio (32+ caracteres) y ponlo como <code className="rounded bg-muted/40 px-1">ADMIN_TOKEN</code> en Vercel → Settings → Environment Variables.
              Luego pégalo aquí para poder usar el panel en producción.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave} className="gap-1.5">
              <Check className="h-4 w-4" />
              Guardar token
            </Button>
            {saved && (
              <Button variant="outline" onClick={onClear}>
                Eliminar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Cómo funciona la seguridad?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-500">1</span>
            <p>Seteas <code className="rounded bg-muted/40 px-1">ADMIN_TOKEN</code> en Vercel (variable de entorno)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-500">2</span>
            <p>Pegas el mismo token aquí (se guarda en tu navegador, no en la BD)</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-500">3</span>
            <p>Todas las acciones del panel envían el token automáticamente. Sin él, las rutas admin devuelven 403.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-500">4</span>
            <p>Las páginas públicas (home, producto, búsqueda) siguen siendo accesibles para todos.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
