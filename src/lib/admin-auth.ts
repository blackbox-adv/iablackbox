// Admin authentication middleware.
// Protects /api/admin/* and admin-mutation routes (import, refresh, approve, etc.)
// from unauthorized access. Uses a shared secret token set via ADMIN_TOKEN env var.
//
// In production (Vercel), set ADMIN_TOKEN in env vars. The admin includes it
// in the x-admin-token header (configured once in the browser via the panel).
//
// For now (MVP without auth system), if ADMIN_TOKEN is NOT set, routes are
// open — but we log a warning. This is acceptable for a single-admin MVP but
// MUST be secured before public launch.

import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

/** Check if a request is authorized for admin operations. */
export function requireAdmin(req: NextRequest): boolean {
  // If no ADMIN_TOKEN is configured, allow (MVP mode — single admin).
  // Log warning for production awareness.
  if (!ADMIN_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[SECURITY] ADMIN_TOKEN not set — admin routes are unprotected!");
    }
    return true;
  }
  const token = req.headers.get("x-admin-token");
  return token === ADMIN_TOKEN;
}

/** Return a 403 JSON response. */
export function forbidden() {
  return NextResponse.json(
    { error: "No autorizado. Token de admin requerido." },
    { status: 403 }
  );
}
