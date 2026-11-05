import os


class Config:
    SITE_NAME = os.getenv("SITE_NAME", "LUNETTE")
    SITE_URL = os.getenv("SITE_URL", "http://localhost:8000")
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    # Where newsletter sign-ups are appended. /tmp is writable on Vercel,
    # but NOT persistent there - use a real database/ESP in production.
    SUBSCRIBERS_FILE = os.getenv("SUBSCRIBERS_FILE", "/tmp/lunette_subscribers.jsonl")
    RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "20"))
    FREE_SHIPPING_THRESHOLD = int(os.getenv("FREE_SHIPPING_THRESHOLD", "75"))
    ASSET_VERSION = os.getenv("ASSET_VERSION", "1")
    JSON_SORT_KEYS = False
    MAX_CONTENT_LENGTH = 16 * 1024  # tiny JSON bodies only
