# Task 4 — Backend API Routes (full-stack-developer)

## Task
Build ALL API route handlers under `src/app/api/` for the BLACKBOX AI product comparison platform. Includes a shared helper at `src/lib/api-helpers.ts` and 14 route files covering home, products, search, scrape, clicks, AI scoring/recommendation, categories, and admin endpoints (sections, affiliates, ai-settings).

## Notes for downstream agents
- Read DB products with `parseProduct(p)` from `@/lib/api-helpers` — JSON fields (images/features/specs) are parsed automatically.
- Use `fetchProductWithRelations(id)` to get a product + its offers (price asc) + latest aiScore.
- Use `fetchProducts(opts)` for list queries (category, q, viral, limit, offset, withRelations).
- All routes return `NextResponse.json(...)`. Error responses use `{ error: string }` with proper status codes.
- Scrape endpoint creates SYNTHETIC products (no real scraping). Reuses existing product if updated < 24h ago and name matches.
- AI endpoints (`/api/ai/score`, `/api/ai/recommend`) read the `ai_tone` setting from `db.aiSetting`.
- Did NOT touch: schema.prisma, db.ts, types.ts, constants.ts, ai.ts, store.ts.
- Did NOT create any page.tsx or React components.

## Files created
- `src/lib/api-helpers.ts`
- `src/app/api/home/route.ts`
- `src/app/api/products/route.ts`
- `src/app/api/products/[id]/route.ts`
- `src/app/api/search/route.ts`
- `src/app/api/scrape/route.ts`
- `src/app/api/clicks/route.ts`
- `src/app/api/ai/score/route.ts`
- `src/app/api/ai/recommend/route.ts`
- `src/app/api/categories/route.ts`
- `src/app/api/admin/sections/route.ts`
- `src/app/api/admin/affiliates/route.ts`
- `src/app/api/admin/affiliates/[id]/route.ts`
- `src/app/api/admin/ai-settings/route.ts`

## Work Log
- Inspected existing lib files (types, constants, ai, db) and Prisma schema.
- Confirmed JSON-string storage convention for Product.images/features/specs and HomeSection.config.
- Created shared `api-helpers.ts` with `parseProduct`, `fetchProductWithRelations`, `fetchProducts`.
- Implemented all 14 route files per the contract.
- Initial smoke test revealed Prisma's SQLite connector rejects `mode: "insensitive"` (the task spec mentioned ILIKE, but SQLite does ASCII case-insensitive matching by default). Removed `mode: "insensitive"` from `contains` filters in `api-helpers.ts` and `scrape/route.ts`.
- Ran `bun run lint` — passed with no errors.
- Smoke-tested every endpoint via curl: home, products list/get/post/put/delete (incl. 404), search (+ AI intent), scrape (freshness reuse + novel synthetic product), clicks, ai/score, ai/recommend, categories, admin/sections (get + put), admin/affiliates (get + post + put), admin/ai-settings (get + put). All returned expected 2xx responses and shapes.

## Stage Summary
- All BLACKBOX backend API routes are live and functional.
- Frontend agent can consume them via relative paths (e.g. `fetch('/api/home')`).
- Scrape + AI routes have try/catch fallbacks so they never crash the server.
- Known SQLite limitation: accent-insensitive search (e.g. "audifonos" won't match "Audífonos") — out of scope; ASCII case-insensitive works.
