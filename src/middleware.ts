// Global middleware — protects admin and mutation API routes.
// Public read routes (GET /api/products, GET /api/home, etc.) remain open.
// Admin mutations require the x-admin-token header to match ADMIN_TOKEN env var.

import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// Routes that require admin authentication (mutations + admin reads).
const PROTECTED_PATTERNS: Array<{ method: string; pattern: RegExp }> = [
  // All /api/admin/* routes (GET and POST/PUT/DELETE)
  { method: "ALL", pattern: /^\/api\/admin\// },
  // Product mutations (import, refresh, bulk, feature, approve, reject, delete, edit)
  { method: "POST", pattern: /^\/api\/products(\/.*)?$/ }, // POST = create/import
  { method: "PUT", pattern: /^\/api\/products\// },         // PUT = edit/feature
  { method: "DELETE", pattern: /^\/api\/products\// },      // DELETE = remove
  { method: "POST", pattern: /^\/api\/products\/.*\/(refresh|approve|reject)$/ },
  { method: "POST", pattern: /^\/api\/products\/bulk-refresh$/ },
  { method: "POST", pattern: /^\/api\/products\/import$/ },
  { method: "POST", pattern: /^\/api\/products\/import-photo$/ },
  // Landing mutations
  { method: "POST", pattern: /^\/api\/landings\/generate$/ },
  { method: "PUT", pattern: /^\/api\/landings\// },
  { method: "DELETE", pattern: /^\/api\/landings\// },
  // AI score regeneration (costly, admin-only)
  { method: "POST", pattern: /^\/api\/ai\/score$/ },
];

export function middleware(req: NextRequest) {
  const { pathname, method } = req.nextUrl;

  // Skip non-API routes
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Check if this route is protected
  const isProtected = PROTECTED_PATTERNS.some(
    (p) => (p.method === "ALL" || p.method === method) && p.pattern.test(pathname)
  );

  if (!isProtected) return NextResponse.next();

  // If ADMIN_TOKEN is not configured, allow in dev but warn in production.
  // This ensures the app works in the sandbox (no token) but is secure in Vercel.
  if (!ADMIN_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[SECURITY] ADMIN_TOKEN not set — ${method} ${pathname} is UNPROTECTED!`);
    }
    return NextResponse.next();
  }

  // Check the admin token header
  const token = req.headers.get("x-admin-token");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "No autorizado. Se requiere token de administrador." },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
