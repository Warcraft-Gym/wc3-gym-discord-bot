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

# Regenerate docs/okf/index.html, the graph viewer that GitHub Pages serves. Node colours per concept type.
okf-graph:
    rm -rf /tmp/okf-spec && git clone -q --depth 1 https://github.com/GoogleCloudPlatform/open-knowledge-format /tmp/okf-spec
    PYTHONPATH=/tmp/okf-spec/src uv run --no-project --with pyyaml python -c "import reference_agent.viewer.generator as G; from pathlib import Path; G._TYPE_PALETTE.clear(); G._TYPE_PALETTE.update({\"Domain Concept\": \"#2a78d6\", \"Decision\": \"#eb6834\", \"Runbook\": \"#1baf7a\", \"Convention\": \"#eda100\", \"Integration\": \"#e87ba4\", \"Data Model\": \"#008300\", \"API Area\": \"#4a3aa7\", \"Pitfall\": \"#e34948\"}); print(G.generate_visualization(Path(\"docs/okf\"), Path(\"docs/okf/index.html\"), bundle_name=\"wc3-gym-discord-bot knowledge bundle\"))"
    sed -i 's#<head>#<head>\n  <meta name="robots" content="noindex, nofollow">#' docs/okf/index.html
