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
    #!/usr/bin/env bash
    set -euo pipefail
    rm -rf /tmp/okf-spec && git clone -q --depth 1 https://github.com/GoogleCloudPlatform/open-knowledge-format /tmp/okf-spec
    PYTHONPATH=/tmp/okf-spec/src uv run --no-project --with pyyaml python - <<'EOF'
    import re
    from pathlib import Path
    import reference_agent.viewer.generator as G
    G._TYPE_PALETTE.clear()
    G._TYPE_PALETTE.update({"Domain Concept": "#2a78d6", "Decision": "#eb6834", "Runbook": "#1baf7a", "Convention": "#eda100", "Integration": "#e87ba4", "Data Model": "#008300", "API Area": "#4a3aa7", "Pitfall": "#e34948"})
    walk = G._walk_concepts
    def rooted(bundle_root):
        # The viewer rewires only bundle-rooted links (/a/b.md); the bundle writes relative ones.
        concepts = walk(bundle_root)
        for c in concepts:
            here = Path(c.id).parent
            c.body = re.sub(r"\]\((?!https?://|/|#)([^)\s]+\.md)(#[^)]*)?\)", lambda m: "](/" + (here / m.group(1)).resolve().relative_to(Path.cwd()).as_posix() + (m.group(2) or "") + ")" if (here / m.group(1)).resolve().is_relative_to(Path.cwd()) else m.group(0), c.body)
        return concepts
    G._walk_concepts = rooted
    print(G.generate_visualization(Path("docs/okf"), Path("docs/okf/index.html"), bundle_name="wc3-gym-discord-bot knowledge bundle"))
    EOF
    sed -i 's#<head>#<head>\n  <meta name="robots" content="noindex, nofollow">#' docs/okf/index.html

# Check docs/okf against OKF v0.2 with a third-party validator, the okf crate. Installs it once.
okf-validate:
    command -v okf >/dev/null || cargo install okf
    okf validate docs/okf
