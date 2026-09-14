---
type: Runbook
title: Run the adapter locally
description: Install with uv, put the two values in .env, serve on port 5004, and send a signed request from the tests.
tags: [runbook, local]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: justfile
    resource: ../../../justfile
    title: The recipes
  - id: readme
    resource: ../../../README.md
    title: README
---

# Steps

1. Install the tools: `uv` and `just`. `uv sync` installs Python 3.13 and the dependencies from `uv.lock`.
2. Create `.env` with `DISCORD_PUBLIC_KEY` and `BACKEND_URL`. The file is ignored by git. `BACKEND_URL` may point at a local backend, for example `http://localhost:5000/discord/interactions`.
3. `uv run just dev` serves the adapter on port 5004 with the values from `.env`.
4. `uv run just test` runs the adapter tests and the bundle check. The tests sign their own requests with a throwaway key, so no Discord application is needed.
5. `uv run just lint` runs ruff.

# Facts

- Discord cannot reach a local port, so a real command never arrives locally. The tests are the way to exercise the handshake; a tunnel is the way to test against Discord itself.
- The adapter reads its two values at import. A missing value fails at start with a `KeyError`, not on the first request.
- The Worker in `cron/` runs with `cd cron && npx wrangler@3 dev --test-scheduled` and needs `BACKEND_API_URL` and `CRON_SECRET` in `cron/.dev.vars`. See [the Worker](../concepts/cast-reminder-worker.md).
