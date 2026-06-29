# BLACKBOX - Worklog

This file tracks all agent work on the BLACKBOX platform.

---
Task ID: 1
Agent: main
Task: Set up Prisma schema for BLACKBOX platform

Work Log:
- Defined models: Product, Offer, User, AiScore, Click, HomeSection, AffiliateLink, AiSetting
- Products support images/features (JSON arrays), specs (JSON), isViral flag
- Offers track store, price, originalPrice, affiliateLink, shipping, availability, rating
- AiScore tracks score 0-100, classification, reasoning, recommendation, bestStore, summary
- HomeSection for admin drag & drop home editor (order + isActive + config JSON)
- AffiliateLink per-store tag config
- AiSetting key-value for AI tone/style settings

Stage Summary:
- Schema written to prisma/schema.prisma
- Ready for db:push

---
Task ID: 4
Agent: full-stack-developer
Task: Build ALL backend API route handlers under `src/app/api/` + shared helper `src/lib/api-helpers.ts` for BLACKBOX platform.

Work Log:
- Read worklog.md, existing lib files (types.ts, constants.ts, ai.ts, db.ts), prisma/schema.prisma, and scripts/seed.ts to understand data shapes & JSON-string storage convention.
- Created `src/lib/api-helpers.ts` with:
  - `parseProduct(p: any): Product` — JSON.parses images/features/specs, maps offers + latest aiScore, converts Date → ISO strings.
  - `fetchProductWithRelations(id): Promise<Product | null>` — uses `include: { offers: { orderBy: price asc }, aiScores: { orderBy: updatedAt desc, take: 1 } }`.
  - `fetchProducts(opts): Promise<{ products, total }>` — filters by category (exact), q (contains on name/description/brand/category/features), viral, isActive, with limit/offset + relations toggle.
- Created `src/app/api/home/route.ts` (GET) — returns `{ sections, featured (8, discount % desc), recommendations (6, aiScore.score desc), categories }`.
- Created `src/app/api/products/route.ts` (GET list + POST create) — GET uses `fetchProducts`; POST creates with JSON.stringified arrays/objects, defaults isActive=true.
- Created `src/app/api/products/[id]/route.ts` (GET / PUT / DELETE) — async params per Next.js 16, 404 handling, partial PUT with JSON.stringify.
- Created `src/app/api/search/route.ts` (GET) — empty q → empty + null intent; non-empty → fetchProducts + analyzeSearchIntent (try/catch, null on failure). Does NOT auto-scrape.
- Created `src/app/api/scrape/route.ts` (POST) — synthetic scrape. Freshness check (similar name, updatedAt ≥ 24h ago → reuse). Otherwise creates Product with category inferred from query keywords, brand="Scraped", images=[], 3 synthetic features, 3 offers (amazon=base, temu=base*0.6, falabella=base*1.2, originalPrice=base*1.4), affiliateLink `https://{store}.com/s?k={encoded}`, and an AI score via `generateAiScore` (wrapped in try/catch).
- Created `src/app/api/clicks/route.ts` (POST) — creates Click (userId null), 404 if product missing.
- Created `src/app/api/ai/score/route.ts` (POST) — reads `ai_tone` from `db.aiSetting` (default "simple"), calls `generateAiScore`, deletes old aiScores then creates new.
- Created `src/app/api/ai/recommend/route.ts` (POST) — reads tone, calls `generateRecommendation`, ephemeral (no persist).
- Created `src/app/api/categories/route.ts` (GET) — distinct active categories.
- Created `src/app/api/admin/sections/route.ts` (GET + PUT) — GET all ordered; PUT bulk updates order+isActive (title/subtitle/config untouched) via `$transaction`.
- Created `src/app/api/admin/affiliates/route.ts` (GET + POST) — list / create affiliate.
- Created `src/app/api/admin/affiliates/[id]/route.ts` (PUT) — partial update.
- Created `src/app/api/admin/ai-settings/route.ts` (GET + PUT) — GET returns key→value map; PUT upserts each entry.
- All handlers: `NextRequest` + `NextResponse.json`, try/catch + `console.error`, dynamic-route params typed as `Promise<{ id: string }>` and awaited.
- Initial smoke test surfaced Prisma SQLite error: `Unknown argument 'mode'` for `contains`. Removed `mode: "insensitive"` from `fetchProducts` and `scrape` — SQLite does ASCII case-insensitive matching by default (accent-insensitive search is out of scope).
- Smoke-tested all 14 endpoints via curl — all returned expected 2xx shapes (incl. 404 for missing product, 201 for create/scrape, AI score/recommend produce real content, admin PUT round-trips).
- `bun run lint` passes with zero errors.

Stage Summary:
- Files created (14 routes + 1 helper):
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
- Did NOT touch: prisma/schema.prisma, src/lib/db.ts, types.ts, constants.ts, ai.ts, store.ts.
- Did NOT create any page.tsx / React component.
- All routes are consumable via relative paths (e.g. `fetch('/api/home')`, `fetch('/api/products?category=Audio&limit=12')`).
- Frontend agent can now build the UI against a working backend.

---
Task ID: 5
Agent: main
Task: Build the entire BLACKBOX frontend (app shell + all views) and verify end-to-end

Work Log:
- Created foundational lib: types.ts, constants.ts (stores/categories/classifications, lime for "good" to avoid blue), ai.ts (z-ai-web-dev-sdk backend AI: score/recommend/searchIntent with fallbacks), store.ts (Zustand nav: home/search/product/compare/admin + compare list)
- Updated layout.tsx (dark mode default, es lang, BLACKBOX metadata) and globals.css (emerald-accent dark theme, custom scrollbar, fade-up/shimmer animations, bg-grid utility)
- Built shared components: providers (TanStack Query), product-image (placeholder+onError fallback), score-ring (circular SVG), badges (store/classification/offer/viral/discount), compare-toggle, price-bars, product-card, header (sticky nav + search), footer (sticky bottom), hero-search, skeletons
- Built hooks/use-blackbox.ts: TanStack Query hooks for home/products/product/search/categories/clicks/scrape/ai-score/ai-recommend + admin hooks + product helpers
- Built 5 views: home-view (hero+offers+categories+ai_recommendations+comparator sections from DB), search-view (AI intent banner + accent-insensitive results + on-demand scrape CTA), product-view (images/desc/features/specs + AI analysis + price comparison bars + store offers with affiliate links + detailed IA recommendation auto-generated via LLM), compare-view (desktop table + mobile cards, score/price/shipping/guarantee/availability), admin-view (4 tabs: Products CRUD with active toggle + offers editor dialog, Home editor drag&drop via @dnd-kit, Affiliates per-store config, IA settings with 4 tones + freshness)
- page.tsx renders views from Zustand store (single / route) with sticky footer layout (min-h-screen flex flex-col, main flex-1, footer in normal flow)
- Fixed lint: refactored admin home editor to key+lazy-initializer pattern (avoids setState-in-effect), removed unused eslint-disable comments
- Fixed accent-insensitive search in api-helpers.ts (normalize diacritics in JS) so "audifonos" matches "Audífonos"

End-to-end verification (agent-browser):
- Home renders: hero, 8 featured offers (scores 76-91, badges, discounts, prices in S/), 5 categories, 6 AI recommendations, comparator CTA, footer
- Product detail: 3 store offers (Amazon/Temu/Falabella), MEJOR PRECIO badge, price bars, AI analysis (score/reasoning/recommendation), detailed IA recommendation (Mejor opción/Alternativa barata/Alternativa premium) generated via LLM (POST /api/ai/recommend 200 in 1.9s)
- Search: accent-insensitive ("audifonos" finds Audífonos), AI intent banner
- On-demand scrape: searched "mini proyector portatil" → POST /api/scrape 201 in 3s → created synthetic product + AI score + 3 offers → navigated to detail
- Comparator: 2 products side-by-side table (puntuación IA, clasificación, mejor precio, precio más alto, envío, garantía, disponibilidad, ver detalle)
- Admin: Products tab (list + active switches + edit/delete + Nuevo producto dialog), Home editor (5 sections drag handles + active switches + Guardar), Affiliates, IA settings (4 tones + enabled switch + freshness 24)
- Sticky footer: verified no overlap (overlapsContent false), CSS pattern correct (min-h-screen flex flex-col, main flex-1)
- Mobile responsive tested at 390x844
- No runtime/console errors; `bun run lint` passes clean

Stage Summary:
- BLACKBOX is fully functional end-to-end. All required features implemented: home with hero+sections, smart search (accent-insensitive + AI intent), product comparison across stores, AI engine (score 0-100 + detailed recommendations via z-ai-web-dev-sdk), comparator, BLACKBOX Control Center admin (products CRUD, home drag&drop editor, affiliates, AI tone settings), on-demand scraping. Dark theme with emerald accent, mobile-first, sticky footer. Dev server running on port 3000.
