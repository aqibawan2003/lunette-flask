"""Static catalogue + page copy. Swap for a database when you need one."""

PRODUCTS = [
    {
        "id": "havana-panto",
        "name": "Havana Panto",
        "price": 189,
        "category": "frames",
        "tagline": "Tortoise acetate · gold brow bar",
        "badge": "Bestseller",
        "image": "img/4-shell.webp",
        "alt": "Havana Panto tortoiseshell eyeglasses with a gold brow bar",
        "colors": ["#6B3F1E", "#1C1917", "#C9A45C"],
        "description": "Our signature frame. Italian acetate with a pattern that runs through the whole material, a gold-plated brow bar and five-barrel hinges.",
    },
    {
        "id": "aria-wire",
        "name": "Aria Wire",
        "price": 159,
        "category": "frames",
        "tagline": "Gold-plated wire · clear tips",
        "badge": None,
        "image": "img/1-wire.webp",
        "alt": "Aria gold wire eyeglasses with clear temple tips",
        "colors": ["#C9A45C", "#B8B8B8"],
        "description": "A featherlight wire frame with adjustable silicone nose pads and clear acetate temple tips.",
    },
    {
        "id": "travel-set",
        "name": "The Travel Set",
        "price": 219,
        "category": "cases",
        "tagline": "Havana Panto + leather case",
        "badge": "New",
        "image": "img/3-open.webp",
        "alt": "Tortoiseshell glasses resting in an open leather case",
        "colors": ["#6B3F1E"],
        "description": "The Havana Panto delivered in a full-grain leather case with a suede lining. Gift-ready.",
    },
    {
        "id": "leather-case",
        "name": "Leather Case",
        "price": 39,
        "category": "cases",
        "tagline": "Full-grain leather · suede lining",
        "badge": None,
        "image": "img/5-closed.webp",
        "alt": "Black leather glasses case with embossed logo and snap button",
        "colors": ["#1C1917"],
        "description": "Soft-structure case that closes with one polished snap. Suede lining doubles as a lens cloth.",
    },
]

CHAPTERS = [
    {
        "t": 0.0,
        "tag": "Handmade acetate",
        "lines": ["See it", "form."],
        "body": "Every frame begins as a single sheet of Italian acetate, shaped by hand until it feels weightless.",
        "nav": "Form",
    },
    {
        "t": 3.2,
        "tag": "Premium carat",
        "lines": ["Precision in", "every detail."],
        "body": "Gold-plated brow bars, five-barrel hinges and a pattern that runs all the way through the material.",
        "nav": "Detail",
    },
    {
        "t": 6.4,
        "tag": "Crafted with care",
        "lines": ["Designed", "with care."],
        "body": "Turn them in the light. Every curve is balanced for comfort from the first morning to the thousandth.",
        "nav": "Care",
    },
    {
        "t": 9.4,
        "tag": "Crafted with care",
        "lines": ["A home for", "what you see."],
        "body": "A soft suede lining and full-grain leather keep your frames safe wherever the day takes them.",
        "nav": "Home",
    },
    {
        "t": 12.6,
        "tag": "Premium with purpose",
        "lines": ["Crafted", "to carry."],
        "body": "Closed with one polished snap. Included with every pair, ready for the journey.",
        "nav": "Carry",
    },
]

NAV = [
    ("Shop", "#collection"),
    ("Craft", "#craft"),
    ("Materials", "#materials"),
    ("The Case", "#case"),
    ("Stories", "#stories"),
]

TRUST = [
    ("truck", "Free shipping over $75"),
    ("return", "30-day easy returns"),
    ("shield", "2-year warranty"),
    ("lens", "Prescription-ready lenses"),
]

MATERIALS = [
    (
        "layers",
        "Italian acetate",
        "Plant-based cellulose, layered and cured slowly so the tortoise pattern runs through the whole frame.",
    ),
    (
        "hinge",
        "Gold-plated hinges",
        "Five-barrel hinges that stay tight, with a thick gold layer that resists wear and skin reactions.",
    ),
    (
        "lens",
        "Clear mineral lenses",
        "Anti-glare, scratch-resistant and ready for your prescription at checkout.",
    ),
]

STATS = [(12, "", "hand-finishing steps"), (48, "h", "polishing and curing"), (2, " yr", "full warranty")]

REVIEWS = [  # SAMPLE COPY - replace with real customer reviews before launch
    (
        "Light enough to forget I'm wearing them, and the tortoise pattern looks different in every light.",
        "Sara K.",
    ),
    (
        "The case alone feels more expensive than the whole pair I used to buy. Everything is solid.",
        "Daniel M.",
    ),
    (
        "Prescription lenses arrived in four days and fit perfectly. Easy returns made it risk-free.",
        "Amina R.",
    ),
]

FAQ = [
    (
        "How long does delivery take?",
        "Orders ship within 2 business days. Standard delivery takes 3-5 business days and is free over $75.",
    ),
    (
        "Can I add my prescription?",
        "Yes. Choose prescription lenses at checkout and upload or type your prescription.",
    ),
    (
        "What if they do not fit?",
        "Send them back within 30 days for a refund or exchange. Return shipping is free.",
    ),
    (
        "What does the warranty cover?",
        "Manufacturing defects, hinge failures and coating wear for two years from delivery.",
    ),
]


def product_by_id(pid: str):
    return next((p for p in PRODUCTS if p["id"] == pid), None)


def search_products(query: str = "", category: str = ""):
    q = query.strip().lower()
    out = []
    for p in PRODUCTS:
        if category and p["category"] != category:
            continue
        hay = f"{p['name']} {p['tagline']} {p['description']}".lower()
        if q and q not in hay:
            continue
        out.append(p)
    return out
