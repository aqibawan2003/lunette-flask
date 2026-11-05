# LUNETTE — Flask eyewear storefront

A complete, production-style home page for a premium eyewear brand, built with **Flask + Jinja + vanilla JS**.
The hero is a single, code-made **one-shot "video"**: glasses and a leather case are shown with whip-pans,
a tilt, real directional motion blur, film grain and a drifting virtual camera — no video file required.

> Brand name, copy and reviews are **placeholders** (reviews are labelled "Sample review"). Replace them before launch.

## Features

| Area | What you get |
|---|---|
| **Hero** | One continuous 16.8 s looping shot, 5 clickable chapters, pause button, reduced-motion support, mouse parallax, optional real `hero.mp4` |
| **Header / nav** | Logo left, links right, scroll-spy, mobile menu with focus trap, search, wishlist, bag with live counts |
| **Home sections** | Trust strip · product grid with filter tabs · craft story with count-up stats · materials · dark "case" feature · reviews · FAQ (accordion) · CTA band · footer |
| **Shop features** | Cart drawer (quantity, remove, free-shipping progress bar), wishlist drawer, live search (`/api/products`), product detail pages, toast messages — all saved in `localStorage` |
| **Newsletter** | Labelled field, inline error messages, JSON API with validation, same-origin check and rate limit |
| **Backend** | App factory, blueprint routes, JSON API, error pages, `/health`, `robots.txt`, `sitemap.xml` |
| **Security** | CSP, `X-Frame-Options`, `nosniff`, HSTS (on HTTPS), referrer/permissions policy, no inline JS, XSS-safe rendering, request-size limit |
| **SEO** | Semantic HTML, one `<h1>`, canonical + Open Graph tags, Store / FAQ / Product JSON-LD, sitemap, robots |
| **Accessibility** | Skip link, visible focus, ARIA labels, dialog roles, `aria-live` regions, keyboard navigation, `prefers-reduced-motion` |
| **DevOps** | Dockerfile (non-root, healthcheck), docker-compose, Vercel config, GitHub Actions (test + publish image), pytest, ruff |

## Quick start

```bash
git clone https://github.com/<you>/lunette.git && cd lunette
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
flask --app app run --debug --port 8000                # or: make run
```

Open <http://localhost:8000>.

Run tests and lint:

```bash
pytest -q
ruff check .
```

## Push to GitHub

```bash
git init -b main
git add .
git commit -m "Initial commit: LUNETTE Flask storefront"
git remote add origin https://github.com/<you>/lunette.git
git push -u origin main
```

GitHub Actions then runs lint + tests + a Docker smoke test (`.github/workflows/ci.yml`).

## Docker

```bash
# build + run
docker build -t lunette:latest .
docker run --rm -p 8000:8000 --env-file .env lunette:latest

# or with compose
docker compose up --build
```

The image runs Gunicorn as a non-root user and exposes `/health` for the container healthcheck.
Set `PORT` (default `8000`) and `WEB_CONCURRENCY` (default `2`) to tune it.

### Push the image

**GitHub Container Registry (automatic):** `.github/workflows/docker-publish.yml` pushes
`ghcr.io/<you>/lunette` on every push to `main` and on tags like `v1.0.0` — no secrets needed.

**Docker Hub (manual):**

```bash
docker login
docker tag lunette:latest <dockerhub-user>/lunette:1.0.0
docker push <dockerhub-user>/lunette:1.0.0
```

To publish to Docker Hub from CI, add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets and
uncomment the second `login-action` block in `docker-publish.yml`.

## Deploy on Vercel

1. Push the repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo. Framework preset: **Other** (Flask is detected from `app.py`).
3. Add environment variables from `.env.example` (at least `SECRET_KEY` and `SITE_URL=https://your-domain`).
4. Deploy.

Or with the CLI: `npm i -g vercel && vercel --prod`.

How it is wired for Vercel:
- `app.py` exposes `app` (Vercel's Flask entrypoint).
- Static files live in `public/static/`, which Vercel serves directly from its CDN. Flask serves the same folder locally and in Docker.
- Vercel's filesystem is **read-only and not persistent**. Newsletter sign-ups are acknowledged but not stored there —
  connect a database or an email provider (see *Next steps*).
- The rate limiter is per-instance memory; use Vercel Firewall / Upstash for strict limits.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | `change-me-in-production` | Flask secret (set a long random value) |
| `SITE_NAME` | `LUNETTE` | Brand name used in templates and meta tags |
| `SITE_URL` | `http://localhost:8000` | Canonical URLs, sitemap, Open Graph |
| `FREE_SHIPPING_THRESHOLD` | `75` | Passed to templates (the cart bar uses the same default) |
| `RATE_LIMIT_PER_MINUTE` | `20` | Newsletter requests per IP per minute |
| `SUBSCRIBERS_FILE` | `/tmp/lunette_subscribers.jsonl` | Newsletter sign-up log |
| `ASSET_VERSION` | `1` | Cache-buster for CSS/JS |
| `PORT`, `WEB_CONCURRENCY` | `8000`, `2` | Docker/Gunicorn |

## Project structure

```
app.py                      # entrypoint (Vercel / Gunicorn / python app.py)
lunette/
  __init__.py               # create_app() factory
  config.py                 # env-driven settings
  routes.py                 # pages, JSON API, sitemap, robots
  security.py               # headers, rate limiter, error handlers
  data.py                   # products, hero chapters, copy
  templates/                # base, index, product, 404, partials (header, footer, hero, overlays, icons)
public/static/
  css/main.css              # design tokens + all styles
  js/main.js                # cart, wishlist, search, menu, filters, forms
  js/hero.js                # the one-shot hero engine
  img/*.webp                # hero + product photos (white background, multiply-blended)
  video/                    # optional hero.mp4
tests/test_app.py           # pytest suite
Dockerfile · docker-compose.yml · vercel.json · .github/workflows/
```

## How the hero looks like ONE video (and not five pictures)

`public/static/js/hero.js` is a single master timeline; every layer is a pure function of time `t`.

1. **No cross-dissolves.** Objects leave and enter the frame by a **whip-pan** (sideways) or **tilt** (vertical), like a real camera move.
2. **Real motion blur.** Blur is computed from each layer's actual velocity and applied along its direction of travel (SVG `feGaussianBlur` with different X/Y deviation).
3. **One virtual camera.** A slow push-in, "breathing" and hand-held drift move all layers together.
4. **One lens, one light.** Film grain, vignette, bokeh, a light sweep and background parallax are shared by the whole shot.

Edit the story in `lunette/data.py` (`CHAPTERS`) and the motion in the `T = { ... }` keyframe tracks in `hero.js`
(`x`/`y` in % of stage width, `s` scale, `ry` 3-D turn, `op` opacity, `bl` focus blur).

### Use your own photos

Photograph or generate objects on a plain light background, then flatten the background to white and export WebP
(~1400 px wide). The layers use `mix-blend-mode: multiply`, so white disappears against the warm hero background.
Replace the files in `public/static/img/` (keep the names, or update `_hero.html` and `data.py`).

### Want a real video?

Still pictures can only be *animated*. If you ever generate a true video from your stills with an AI video tool,
export it as `public/static/video/hero.mp4` (≈17 s, 16:10, muted, H.264, under ~5 MB). The hero detects the file
and plays it instead of the layers, with chapters synced to the video's time. `*.mp4` is git-ignored by default —
add it with `git add -f public/static/video/hero.mp4`.

## SEO checklist

Implemented in code: semantic HTML, one `<h1>`, titles/descriptions, canonical, Open Graph, JSON-LD, `sitemap.xml`,
`robots.txt`, lazy-loaded images with `width`/`height`, internal links (nav, footer, product cards, related products).

Outside the code (your plan): **fast hosting** (Vercel CDN or a fast VPS), a **lightweight theme** (this one ships ~20 KB of
CSS and no framework), a **publishing-frequency plan** (add blog/story pages on a schedule), and **backlinks**.

## Next steps

- Real checkout: Stripe Checkout or Shopify Buy SDK behind the "Checkout" button.
- Store sign-ups in a database or send to Mailchimp/Resend (replace the file write in `routes.py`).
- Product CMS or database instead of `data.py`.
- Generate real photography for more frames and a second hero chapter set.

## Notes on what was verified

Tests (`pytest`), lint (`ruff`), the Gunicorn server and the UI in a real browser (hero timeline frames, cart, wishlist, filters,
search, newsletter, mobile layout) were checked during development. The Docker image and the Vercel deployment were **not**
built or deployed in the environment that produced this project, so run `docker build` and a first Vercel deploy yourself
and open an issue if anything differs.

## License

MIT — see [LICENSE](LICENSE).
