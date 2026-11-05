"""Entry point for local dev, Gunicorn and Vercel (Vercel looks for `app` here)."""

from lunette import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
