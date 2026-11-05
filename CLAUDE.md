# CLAUDE.md — project guide for AI assistants

## What this is
LUNETTE: a Flask (Jinja + vanilla JS) eyewear storefront home page. The hero is a code-made, single-shot "video"
(`public/static/js/hero.js`). Deploys to Docker and Vercel.

## Commands
- Install: `pip install -r requirements-dev.txt`
- Run (dev): `flask --app app run --debug --port 8000`
- Run (prod-like): `gunicorn app:app -b 0.0.0.0:8000`
- Test: `pytest -q`   ·   Lint/format: `ruff check . && ruff format .`
- Docker: `docker build -t lunette . && docker run --rm -p 8000:8000 --env-file .env.example lunette`

## Layout
- `app.py` — entrypoint exposing `app` (Vercel + Gunicorn).
- `lunette/` — `create_app()` factory, `routes.py`, `security.py`, `data.py` (all copy/products), `templates/`.
- `public/static/` — CSS, JS, images, optional video. Flask's static folder points here so Vercel's CDN serves it.

## Rules to follow
1. **No inline JS** and no inline event handlers: the CSP is `script-src 'self'`. Put code in `public/static/js/`.
   Inline `style=""` attributes are allowed; keep them rare.
2. Render user/API data with `textContent` (never `innerHTML` with data). Keep JSON endpoints JSON-only.
3. Edit copy/products in `lunette/data.py`, not in templates. Hero chapters live in `CHAPTERS`.
4. After changing CSS/JS bump `ASSET_VERSION` (env var) to bust caches.
5. Keep static assets in `public/static/` only. Product/hero photos are WebP with a **white** background and are drawn with `mix-blend-mode: multiply` — never put a stacking context (`z-index`, `transform`, `filter`, `isolation`, `clip-path`) on an ancestor between `.hero` and `.layer`, or the blend stops working.
6. Hero changes: every layer is a pure function of time `t` in `hero.js` (`T` keyframe tracks). Keep whip-pan / tilt entrances (no cross-dissolves), keep `prefers-reduced-motion` handling and the pause button.
7. UI conventions (from the owner's design rules): logo left + nav right; one solid primary button and an outline secondary (never equal weight); body text ≥ 14 px with default letter-spacing; type scale 12/14/16/20/24/32 (display headings excepted); visible form labels (placeholder is only an example); inline error messages directly under the field; single email field; selectable cards over radio buttons; thin-line modern icons.
8. Never copy brand names, designer handles or watermarks from reference designs into the code, meta tags, alt text or content. Use the owner's brand or neutral placeholders. Reviews in `data.py` are sample copy.
9. Every change: run `ruff check .` and `pytest -q` before committing; add a test for new routes/API behaviour.
10. Do not commit `.env`, subscriber files, or large videos (`*.mp4` is git-ignored).

## Known limits
- Vercel's filesystem is read-only/non-persistent: newsletter sign-ups are not stored there. The rate limiter is per-instance.
- The cart is client-side (`localStorage`); checkout is a placeholder button.
- Docker image and Vercel deploy were not built/deployed in the authoring environment — verify on first run.
