set shell := ["bash", "-euo", "pipefail", "-c"]

# The cast-reminder Worker on Cloudflare: `just cron deploy staging`.
mod cron

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

# Regenerate docs/okf/index.html, the graph viewer that GitHub Pages serves.
okf-graph:
    rm -rf /tmp/okf-spec && git clone -q --depth 1 https://github.com/GoogleCloudPlatform/open-knowledge-format /tmp/okf-spec
    PYTHONPATH=/tmp/okf-spec/src uv run --no-project --with pyyaml python -c "from pathlib import Path; from reference_agent.viewer import generate_visualization as g; print(g(Path(\"docs/okf\"), Path(\"docs/okf/index.html\"), bundle_name=\"wc3-gym-discord-bot knowledge bundle\"))"
    sed -i 's#<head>#<head>\n  <meta name="robots" content="noindex, nofollow">#' docs/okf/index.html
