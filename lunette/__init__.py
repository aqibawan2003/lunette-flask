"""LUNETTE storefront - Flask application factory."""

from __future__ import annotations

from pathlib import Path

from flask import Flask

from .config import Config

ROOT = Path(__file__).resolve().parent.parent


def create_app(config: type[Config] | dict | None = None) -> Flask:
    # Static files live in public/static so Vercel serves them from its CDN
    # (Vercel only serves /public automatically); Flask serves the same
    # folder locally and inside Docker.
    app = Flask(
        __name__,
        static_folder=str(ROOT / "public" / "static"),
        static_url_path="/static",
        template_folder="templates",
    )
    app.config.from_object(Config)
    if isinstance(config, dict):
        app.config.update(config)
    elif config is not None:
        app.config.from_object(config)

    from .routes import bp
    from .security import register_security

    app.register_blueprint(bp)
    register_security(app)

    @app.context_processor
    def inject_globals():
        video = Path(app.static_folder) / "video" / "hero.mp4"
        from .data import NAV

        return {
            "nav": NAV,
            "site_name": app.config["SITE_NAME"],
            "site_url": app.config["SITE_URL"].rstrip("/"),
            "hero_video": video.exists(),
            "asset_version": app.config["ASSET_VERSION"],
        }

    return app


app = create_app()  # convenient for `flask --app lunette run`
