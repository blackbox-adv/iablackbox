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

---
Task ID: v4
Agent: full-stack-developer
Task: Build the BLACKBOX V2 backend API routes — real-data-only import/refresh/feature/scheduled-offers + extended types & parseProduct, plus removal of the synthetic scrape route and home featured reordering.

Work Log:
- Read worklog.md (Task 1, 4, 5), prisma/schema.prisma (V2 Product fields + PriceHistory/ScheduledOffer/Favorite/PriceAlert/User.role), existing src/lib/api-helpers.ts, src/lib/types.ts, src/lib/scraper/{types.ts,index.ts}, src/lib/ai-analysis.ts (ProductAnalysisInput/ProductAnalysis shapes), src/lib/constants.ts, src/app/api/home/route.ts, src/app/api/scrape/route.ts, src/app/api/products/{route.ts,[id]/route.ts}, src/lib/db.ts.
- Updated `src/lib/types.ts`:
  - Added `Faq { q: string; a: string }` interface.
  - Extended `Product` with optional sourcing/SEO fields: `sourceUrl?`, `sourceStore?`, `slug?`, `isFeatured: boolean` (required), `lastFetchedAt?`, `metaTitle?`, `metaDescription?`.
  - Added V2 AI-analysis array fields: `advantages: string[]`, `disadvantages: string[]`, `useCases: string[]`, `faqs: Faq[]`.
  - Added `PriceHistoryPoint { id; productId; store; price; currency; recordedAt: string }`.
  - Kept all existing exports (Store, Offer, AiScore, HomeSection, AffiliateLink, ProductWithRelations, etc.) unchanged.
- Updated `src/lib/api-helpers.ts`:
  - Extended `parseProduct(p)` to parse the new JSON-string columns (`advantages`, `disadvantages`, `useCases`, `faqs`) safely with try/catch → empty array fallback, and to include `sourceUrl`, `sourceStore`, `slug`, `isFeatured`, `lastFetchedAt` (Date → ISO string), `metaTitle`, `metaDescription`. Existing fields/behavior preserved.
  - Added `getAiTone(): Promise<AiTone>` — reads `ai_tone` from AiSetting (default "simple").
  - Added `ensureUniqueSlug(slug, excludeProductId?)` — appends `-2`, `-3`, … to avoid unique collisions.
  - Added `refreshProduct(id): Promise<Product>` shared helper: re-scrapes `product.sourceUrl`, builds analysis input from scraped data + existing offers excluding the source store's old offer, runs `analyzeProduct`, updates non-null Product fields + advantages/disadvantages/useCases/faqs/metaTitle/metaDescription/lastFetchedAt + slug (only if changed & unique), upserts the source store's offer, records a PriceHistory entry, deletes old aiScores and creates a new one. Throws on hard failure so callers can map to per-id error.
- Created `src/app/api/products/import/route.ts` (POST):
  - Body `{ url }`, validates URL with `/^https?:\/\//i` (400 otherwise).
  - `scrapeUrl(url)` wrapped in try/catch → 500 with error message.
  - Reads ai_tone, builds analysis input via `scrapedToAnalysisInput(scraped, [])`, calls `analyzeProduct(analysisInput, tone)`.
  - Creates Product: name = scraped.name ?? "Producto importado"; description = scraped.description ?? ""; category = scraped.category ?? "Tecnología"; brand = scraped.brand; images/features/specs JSON.stringified; advantages/disadvantages/useCases/faqs JSON.stringified from analysis; metaTitle/metaDescription from analysis; sourceUrl = url; sourceStore = scraped.sourceStore; slug from `ensureUniqueSlug(analysis.slug)`; lastFetchedAt = now; isActive = true; isFeatured = false.
  - If `scraped.price != null`: creates source-store Offer (affiliateLink=url, shippingTime = scraped.shippingTime ?? "No disponible", availability, rating, reviewCount, currency = scraped.currency ?? "PEN") and a PriceHistory entry (recordedAt = now).
  - Creates AiScore from analysis (score, classification, reasoning, recommendation, bestStore, summary).
  - Returns `{ product }` (via `fetchProductWithRelations`) with status 201.
- Created `src/app/api/products/[id]/refresh/route.ts` (POST):
  - Async params per Next.js 16. 404 if product not found; 400 if no sourceUrl.
  - Delegates to shared `refreshProduct(id)` and returns `{ product }`.
- Created `src/app/api/products/bulk-refresh/route.ts` (POST):
  - Body `{ ids: string[] }`. 400 if missing/empty.
  - Processes ids sequentially via `refreshProduct(id)` with a 250 ms delay between calls to be polite to upstream stores. Per-id `{ id, success, error? }` results aggregated — one failure doesn't block others.
- Created `src/app/api/products/[id]/feature/route.ts` (PUT):
  - Body `{ isFeatured: boolean }`. 400 if invalid; 404 if product missing.
  - Toggles `isFeatured` and returns `{ product }` with relations.
- Created `src/app/api/admin/scheduled-offers/route.ts` (GET + POST):
  - GET: returns `{ offers: ScheduledOffer & { productName: string }[] }`, joined with product name, ordered by startDate asc.
  - POST body `{ productId, label, startDate, endDate }` → validates fields + product existence (404), validates dates (400), creates with isActive=true, returns `{ offer }` 201.
- Deleted `src/app/api/scrape/route.ts` entirely (V2 spec forbids synthetic data). Verified `src/app/api/scrape/` directory is removed.
- Updated `src/app/api/home/route.ts`:
  - Featured array now orders products with `orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }]` at the DB level and re-sorts in JS by `isFeatured` desc then `discount %` desc, sliced to 8. Removed the prior filter that excluded non-discounted products, so manually featured products (even without discounts) now surface.
  - Recommendations stays top-scored (aiScore.score desc), limit 6. Sections and categories unchanged. Response shape `{ sections, featured, recommendations, categories }` preserved.
- Code style conformance: `NextRequest`/`NextResponse`, async `params: Promise<{ id: string }>` with `await params`, try/catch + `console.error` + JSON error responses, JSON.stringify for arrays/objects on write, no `any` except where the existing `parseProduct` row param uses it.
- Did NOT touch: prisma/schema.prisma, src/lib/db.ts, src/lib/scraper/*, src/lib/ai-analysis.ts, src/lib/ai.ts, src/lib/constants.ts, src/lib/store.ts. Did NOT create any page.tsx / React component. Did NOT write test files.
- `bun run lint` passes with zero errors (exit code 0).

Stage Summary:
- Files modified (3):
  - `src/lib/types.ts` (new Product fields, Faq, PriceHistoryPoint)
  - `src/lib/api-helpers.ts` (extended parseProduct + getAiTone, ensureUniqueSlug, refreshProduct)
  - `src/app/api/home/route.ts` (featured prioritizes isFeatured, fallback discount)
- Files created (5 new routes):
  - `src/app/api/products/import/route.ts` (POST)
  - `src/app/api/products/[id]/refresh/route.ts` (POST)
  - `src/app/api/products/bulk-refresh/route.ts` (POST)
  - `src/app/api/products/[id]/feature/route.ts` (PUT)
  - `src/app/api/admin/scheduled-offers/route.ts` (GET + POST)
- Files deleted (1):
  - `src/app/api/scrape/route.ts` (synthetic route, removed with its directory)
- Lint passes clean. V2 real-data-only import/refresh/feature pipelines are wired end-to-end (scraper → AI analysis → Product/Offer/PriceHistory/AiScore persistence). Frontend agent can now wire import/refresh UIs against `/api/products/import`, `/api/products/[id]/refresh`, `/api/products/bulk-refresh`, `/api/products/[id]/feature`, and the admin scheduled-offers CRUD — and the synthetic scrape CTA in the search view should be removed by the frontend agent since `/api/scrape` no longer exists.

---
Task ID: v2
Agent: main
Task: BLACKBOX V2 — real-data-only platform: import from URL, AI that never invents, modular scraper, scalable schema

Work Log:
- Schema V2: added Product fields (sourceUrl, sourceStore, slug @unique, isFeatured, lastFetchedAt, metaTitle, metaDescription, advantages, disadvantages, useCases, faqs as JSON strings) + new models (PriceHistory, ScheduledOffer, Favorite, PriceAlert) + User.role. Pushed to DB.
- Scraper module (src/lib/scraper/): modular registry pattern with types.ts (ScrapedProduct, Scraper interface, detectStore), web-reader.ts (z-ai page_reader adapter), html-parser.ts (JSON-LD Schema.org Product extraction, meta tags, image/price/rating parsers), amazon.ts/temu.ts/falabella.ts/generic.ts (per-store adapters), index.ts (registry + scrapeUrl). Real-data-only: all fields nullable, "No disponible" is UI's job. Future official-API adapters implement same interface — zero caller changes.
- AI analysis module (src/lib/ai-analysis.ts): analyzeProduct() generates summary/advantages/disadvantages/useCases/score/classification/reasoning/recommendation/bestStore/faqs/metaTitle/metaDescription/slug. STRICT no-invention rule in system prompt: "NUNCA inventes precios, ratings, specs. Si no existe, escribe 'No disponible'." scrapedToAnalysisInput() maps scraped data to analysis input.
- Backend (subagent v4): updated parseProduct + types for new fields; new routes POST /api/products/import (URL→scrape→AI→create Product+Offer+PriceHistory+AiScore), POST /api/products/[id]/refresh (re-scrape+re-analyze), POST /api/products/bulk-refresh (sequential), PUT /api/products/[id]/feature (toggle), GET/POST /api/admin/scheduled-offers; deleted synthetic /api/scrape; home route prioritizes isFeatured. Lint clean.
- Frontend: admin-products rewritten with big "Importar producto" button + URL dialog (with "no inventa datos" warning), per-row "Actualizar información" (refresh) + star (feature) buttons, bulk-select checkboxes + "Actualizar N" bulk action, edit dialog with affiliate link field. Search view rewritten: removed synthetic scrape CTA, replaced with clear "Sin resultados / BLACKBOX no inventa productos / agrega desde el admin" message. Product view enhanced: new AnalysisSection (ventajas/desventajas/casos de uso), FaqSection (accordion), source provenance footer ("Información obtenida de [tienda] · actualizada hace X"). Hooks: added useImportProduct, useRefreshProduct, useBulkRefresh, useToggleFeature; removed useScrape.
- Fixed Prisma client staleness: regenerated client + restarted dev server + cleared .next cache.

End-to-end verification (agent-browser):
- Import flow: POST /api/products/import 201 in 11.2s (Falabella URL) — scraped real page, created product, AI generated full analysis (VENTAJAS/DESVENTAJAS/CASOS DE USO/FAQs). Amazon URLs return 404/blocked (anti-bot) but system handles gracefully — never invents data.
- Product page: all V2 AI sections present (ventajas, desventajas, casos de uso, FAQs, source provenance). "No disponible" for missing data.
- Search: "super nintendo" → "Sin resultados" + "BLACKBOX no inventa productos" message, NO synthetic scrape CTA.
- Admin: Importar producto dialog with URL field + warning, refresh/feature/edit/delete buttons per row, bulk select + update.
- No runtime/console errors after reload. `bun run lint` clean.

Stage Summary:
- BLACKBOX V2 is real-data-only. Products come exclusively from admin-imported affiliate URLs (Amazon/Temu/Falabella/generic) via real web scraping (z-ai page_reader + JSON-LD parsing). AI analysis never invents — missing data shows "No disponible". Architecture is modular (scraper registry ready for official API swap) and scalable (schema supports price history, favorites, alerts, scheduled offers, multi-currency, user roles). Note: Amazon/Falabella actively block automated readers (anti-bot), so real product data extraction depends on the store's accessibility; the architecture is designed so official API adapters can be dropped in without rewriting the app.

---
Task ID: v2-fix
Agent: main
Task: Fix Temu short-link detection + add no-data guard + clean all seeded/empty products

Work Log:
- Diagnosed: temu.to short link resolves to temu.com but Temu is a 100% JS-rendered SPA — page_reader returns 1.9MB HTML shell with generic homepage title and NO product data (no "reloj", no price). Confirmed via direct z-ai page_reader test.
- Fixed detectStore() + temuScraper.matches() to recognize temu.to (short links).
- Added NoProductDataError + assertHasProductData() guard in src/lib/scraper/types.ts: refuses to save a product when the scraped page has no real product name AND no price (detects generic titles like "Temu | Explore...", "Page Not Found", "Documento no encontrado", "Just a moment" cloudflare, etc.).
- Wired guard into POST /api/products/import (returns 422 with clear user-facing message) and refreshProduct() (throws instead of wiping existing product).
- Deleted ALL 19 products (13 V1 seeded + 6 bad V2 imports) — DB now has 0 products. Kept config (home sections, affiliates, ai settings).
- Verified: POST /api/products/import 422 in 2.6s for temu.to link, DB count stays 0, toast shows clear error message to admin.
- Empty admin state shows "Aún no hay productos / Importa el primero".
- `bun run lint` clean.

Stage Summary:
- BLACKBOX now refuses to create fake/empty products. Temu (and Amazon when blocked) return a clear error explaining the store blocks automated readers. The user can: (a) import from a store that returns server-rendered HTML, (b) enter product data manually via the edit dialog, or (c) integrate official affiliate APIs later (architecture is ready). DB is clean — only real imported products will appear.

---
Task ID: v2-temu-fix
Agent: main
Task: Fix Temu import — headless browser fallback + manual entry

Work Log:
- Diagnosed: Temu is 100% JS-rendered SPA. page_reader returns empty shell. Confirmed temu.to short link redirects to temu.com with goods_id.
- Fixed detectStore + temuScraper to recognize temu.to short links.
- Built headless browser fallback (src/lib/scraper/headless.ts): uses agent-browser CLI (Playwright) via spawnSync with isolated --session bb-scraper. Opens URL, waits for networkidle, extracts product data from rendered DOM (h1, meta tags, body text, images). Mines name from body text when h1 is generic. Mines price from body text (excludes shipping/min-order context).
- Wired into import route: static scrape first → if NoProductDataError → try headless fallback → if still no data → return 422 with clear message.
- Fixed CSS selector quoting issue: og:image colon breaks querySelector, rewrote to iterate meta tags via getElementsByTagName.
- Result: Temu STILL blocks the headless browser (anti-bot detects Playwright → empty body, body.length=0). This is expected — Temu has aggressive anti-bot. The headless fallback works for LESS-protected sites but not Temu specifically.
- Added "Crear manualmente" button to admin panel alongside "Importar producto". Manual form includes all fields + sourceUrl. When scraping fails, admin enters data by hand — the sourceUrl is saved so "Ver oferta" links to the exact product and "Actualizar información" can retry.
- Updated POST /api/products to accept sourceUrl + auto-detect sourceStore.
- Verified: manual creation works (POST /api/products 201), product page shows name/description/source provenance/"Recalcular IA" button.
- `bun run lint` clean.

Stage Summary:
- Temu cannot be auto-scraped (anti-bot blocks both static reader AND headless browser). Amazon partially works. The practical path for Temu products is manual entry via "Crear manualmente" — paste the product URL as sourceUrl, enter name/description/images/price by hand, then "Recalcular IA" generates the analysis. The import-with-headless fallback remains for less-protected stores. This is the honest real-world limitation: Temu/Amazon actively block automated access; only official affiliate APIs would give reliable data.
