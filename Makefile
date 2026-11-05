.PHONY: install run test lint docker docker-run
install:        ## create venv + install deps
	python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt
run:            ## dev server on :8000
	flask --app app run --debug --port 8000
test:
	pytest -q
lint:
	ruff check . && ruff format --check .
docker:
	docker build -t lunette:latest .
docker-run:
	docker run --rm -p 8000:8000 --env-file .env.example lunette:latest
