# MyPlace — E-commerce Store

Static storefront on GitHub Pages (`myplace.tn`) + Cloudflare Worker backend + Supabase database.
**Cost: $0 — all services on free tiers, no card required.**

## Architecture

```
Customer browser (https://myplace.tn — GitHub Pages)
   ├── products/categories  → Supabase REST (public read, anon key + RLS)
   └── POST /api/orders      → Cloudflare Worker → Supabase (service-role key, never exposed)
You (admin)                  → Supabase Dashboard → see orders in the `orders` table
```

## 1. Supabase setup (5 min)

1. Create a free project at https://supabase.com → "New project" (Free plan, no card).
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**.
   This creates `categories`, `products`, `orders` tables, security rules (RLS) and seed data.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → becomes `SUPABASE_URL`
   - `anon public` key → becomes `SUPABASE_ANON_KEY`
   - `service_role` key → becomes the Worker secret `SUPABASE_SERVICE_ROLE_KEY` (keep private!)

**Managing your store:** Dashboard → Table Editor → edit `products` / `categories` rows.
The website updates automatically. Put image/video URLs in the `image_urls` / `video_urls`
columns (JSON arrays, e.g. `["https://.../1.jpg", "https://.../2.jpg"]`).
New orders appear in the `orders` table — change `status` to track them.

> Tip: free projects pause after ~7 days without any API traffic. Any visitor keeps it awake;
> if paused, one click on "Restore" in the dashboard resumes it.

## 2. Cloudflare Worker setup (5 min)

1. Install Node.js (https://nodejs.org).
2. Open a terminal in the `worker/` folder:

```bash
cd worker
npm install
npx wrangler login          # opens browser, log in with your Cloudflare account (free)
npx wrangler secret put SUPABASE_URL
# → paste your Supabase project URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# → paste your Supabase service_role key
npx wrangler deploy
```

3. Note the printed URL, e.g. `https://myplace-api.<your-subdomain>.workers.dev`
   → becomes `API_URL` (without trailing slash).

Test it:

```bash
curl https://myplace-api.<your-subdomain>.workers.dev/health
# → {"ok":true,"service":"myplace-api"}
```

## 3. GitHub secrets (2 min)

In your repo: **Settings → Secrets and variables → Actions → New repository secret**:

| Secret                    | Value                                      |
|---------------------------|--------------------------------------------|
| `SUPABASE_URL`            | `https://xxxx.supabase.co`                 |
| `SUPABASE_ANON_KEY`       | anon public key from Supabase              |
| `API_URL`                 | `https://myplace-api.<sub>.workers.dev`    |

Push to `main` → GitHub Actions deploys the site. The placeholders in `index.html`
(`__SUPABASE_URL__`, etc.) are replaced at build time.

## 4. Verify

- [ ] Products load with images and prices on https://myplace.tn/#shop
- [ ] Category chips filter the grid
- [ ] Lightbox shows photos (and videos if a product has `video_urls`)
- [ ] Add to cart → open cart → change quantities → total updates
- [ ] Place a test order → appears in Supabase `orders` table
- [ ] Security check: `curl "https://xxxx.supabase.co/rest/v1/orders" -H "apikey: YOUR_ANON_KEY"` returns an error (RLS blocks public reads)

## 5. SEO (after first deploy)

1. Go to https://search.google.com/search-console → add `https://myplace.tn/`
   (verify with a DNS TXT record at OVH).
2. Click **URL Inspection** → enter `https://myplace.tn/` → **Request Indexing**.
3. Google re-crawls over the next 1–4 weeks; the old "freelancing agency" snippet fades out.

Optional: replace `og-image.png` referenced in `index.html` with a real store image (1200×630).
Note: og:image currently points to a file you must add (any name works if referenced consistently).

## Updating products without code

- Add/edit rows in Supabase → Table Editor → `products` (or `categories`).
- Website always fetches the latest data on load — no redeploy needed.
- Out of stock = set `available` to `false` or `stock` to `0` (button gets disabled).

## Where are the files?

- `index.html` — storefront (products grid, cart, checkout, SEO tags)
- `app.js` — store logic (fetch, cart, lightbox, checkout)
- `style.css` — styles (existing dark/red theme + e-commerce sections)
- `worker/` — Cloudflare Worker backend source (`wrangler deploy` from there)
- `supabase/schema.sql` — database tables, security rules and seed data
- `.github/workflows/deploy.yml` — GitHub Pages deployment with secret injection
