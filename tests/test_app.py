import pytest

from lunette import create_app


@pytest.fixture()
def client(tmp_path):
    app = create_app(
        {"TESTING": True, "SUBSCRIBERS_FILE": str(tmp_path / "subs.jsonl"), "RATE_LIMIT_PER_MINUTE": 3}
    )
    return app.test_client()


def test_home_renders_all_sections(client):
    r = client.get("/")
    html = r.get_data(as_text=True)
    assert r.status_code == 200
    for marker in (
        'id="top"',
        'id="collection"',
        'id="craft"',
        'id="materials"',
        'id="case"',
        'id="stories"',
        'id="faq"',
        "<footer",
        'id="nl"',
        "data-chapters=",
    ):
        assert marker in html
    assert html.count("<h1") == 1  # one h1 per page (SEO)


def test_security_headers(client):
    r = client.get("/")
    assert "default-src 'self'" in r.headers["Content-Security-Policy"]
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"


def test_health(client):
    assert client.get("/health").get_json() == {"status": "ok"}


def test_product_page_and_404(client):
    assert client.get("/product/havana-panto").status_code == 200
    assert client.get("/product/nope").status_code == 404
    assert client.get("/api/nope").get_json() == {"error": "Not found"}


def test_products_api_search_and_filter(client):
    assert client.get("/api/products").get_json()["count"] == 4
    assert client.get("/api/products?q=wire").get_json()["count"] == 1
    assert client.get("/api/products?category=cases").get_json()["count"] == 2


def test_newsletter_validation(client):
    bad = client.post("/api/newsletter", json={"email": "nope"})
    assert bad.status_code == 400
    assert client.post("/api/newsletter", data="email=a@b.co").status_code == 415
    ok = client.post("/api/newsletter", json={"email": "a@example.com"})
    assert ok.status_code == 201


def test_newsletter_blocks_cross_origin_and_rate_limits(client):
    r = client.post(
        "/api/newsletter", json={"email": "a@example.com"}, headers={"Origin": "https://evil.example"}
    )
    assert r.status_code == 403
    codes = [
        client.post("/api/newsletter", json={"email": f"u{i}@example.com"}).status_code for i in range(5)
    ]
    assert 429 in codes


def test_seo_files(client):
    assert "Sitemap:" in client.get("/robots.txt").get_data(as_text=True)
    assert "<urlset" in client.get("/sitemap.xml").get_data(as_text=True)
