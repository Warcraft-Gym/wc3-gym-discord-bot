set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

# Run the tests.
test:
    uv run pytest -q

# Lint and format check.
lint:
    uv run ruff check .
    uv run ruff format --check .

# Serve the adapter on :5004 with the values from .env.
dev:
    uv run --env-file .env uvicorn app:app --port 5004

# Deploy the working tree: prod promotes it, staging makes a preview.
deploy env="prod":
    npx vercel deploy --archive=tgz {{ if env == "prod" { "--prod" } else { "" } }}
