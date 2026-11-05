from __future__ import annotations

import json
import re
import time
from urllib.parse import urlparse

from flask import Blueprint, Response, abort, current_app, jsonify, render_template, request

from . import data
from .security import client_ip, rate_limited

bp = Blueprint("main", __name__)
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


@bp.get("/")
def index():
    faq_ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in data.FAQ
        ],
    }
    return render_template(
        "index.html",
        products=data.PRODUCTS,
        chapters=data.CHAPTERS,
        nav=data.NAV,
        trust=data.TRUST,
        materials=data.MATERIALS,
        stats=data.STATS,
        reviews=data.REVIEWS,
        faq=data.FAQ,
        faq_ld=faq_ld,
        free_shipping=current_app.config["FREE_SHIPPING_THRESHOLD"],
    )


@bp.get("/product/<pid>")
def product(pid: str):
    p = data.product_by_id(pid)
    if not p:
        abort(404)
    related = [x for x in data.PRODUCTS if x["id"] != pid][:3]
    return render_template(
        "product.html",
        p=p,
        related=related,
        nav=data.NAV,
        free_shipping=current_app.config["FREE_SHIPPING_THRESHOLD"],
    )


@bp.get("/health")
def health():
    return jsonify(status="ok")


@bp.get("/api/products")
def api_products():
    items = data.search_products(request.args.get("q", "")[:60], request.args.get("category", "")[:20])
    return jsonify(products=items, count=len(items))


@bp.post("/api/newsletter")
def api_newsletter():
    # JSON-only + same-origin check blocks cross-site form posts (CSRF).
    if not request.is_json:
        return jsonify(error="Send JSON."), 415
    origin = request.headers.get("Origin")
    if origin and urlparse(origin).netloc != request.host:
        return jsonify(error="Cross-origin request blocked."), 403
    if rate_limited(f"nl:{client_ip()}", current_app.config["RATE_LIMIT_PER_MINUTE"]):
        return jsonify(error="Too many requests. Please try again in a minute."), 429
    email = str((request.get_json(silent=True) or {}).get("email", "")).strip()
    if not EMAIL_RE.match(email) or len(email) > 254:
        return jsonify(error="Please enter a valid email address, like name@example.com."), 400
    try:
        with open(current_app.config["SUBSCRIBERS_FILE"], "a", encoding="utf-8") as fh:
            fh.write(json.dumps({"email": email, "ts": int(time.time())}) + "\n")
    except OSError:  # read-only filesystem: still acknowledge, log instead
        current_app.logger.info("newsletter signup (not persisted): %s", email)
    return jsonify(message="Thanks - you are subscribed."), 201


@bp.get("/robots.txt")
def robots():
    base = current_app.config["SITE_URL"].rstrip("/")
    return Response(f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n", mimetype="text/plain")


@bp.get("/sitemap.xml")
def sitemap():
    base = current_app.config["SITE_URL"].rstrip("/")
    urls = [f"{base}/"] + [f"{base}/product/{p['id']}" for p in data.PRODUCTS]
    body = "".join(f"<url><loc>{u}</loc></url>" for u in urls)
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>'
    return Response(xml, mimetype="application/xml")
