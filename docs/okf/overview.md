---
type: Repository
title: wc3-gym-discord-bot
description: The Discord interactions adapter of the Warcraft Gym league app, one Starlette route on Vercel, plus the Cloudflare Worker that calls the backend's reminder job every five minutes.
tags: [repository, discord, starlette, vercel, cloudflare]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: readme
    resource: ../../README.md
    title: README
  - id: pyproject
    resource: ../../pyproject.toml
    title: Project metadata
---

# What it is

Discord posts every slash command, button press and autocomplete of the Gym Newbie League (GNL) app to this adapter. The adapter checks Discord's signature, answers inside Discord's 3 second window, and forwards the signed payload unchanged to the backend, which checks the same signature again and does the work. The adapter knows no command and holds no bot token.

Beside it, `cron/` is a Cloudflare Worker that calls the backend's cast-reminder job every five minutes, because the backend's hosting plan runs one cron a day.

# Where it runs

| Target | What |
|---|---|
| production | a Vercel project built from `main`; the Discord application's Interactions Endpoint URL points at it |
| preview | every pull request; Discord is not pointed at previews |
| local | `uv run just dev` on port 5004 |
| the Worker | Cloudflare, one Worker for production with a schedule and one for staging without |

# Layout

```
app.py        the adapter: verify, answer, forward
tests/        the handshake as tests, and the bundle check
cron/         the Worker: index.js, its test, wrangler.jsonc, its justfile
justfile      test, lint, dev, deploy; `mod cron` for the Worker
vercel.json   maxDuration 60 for the background forward
docs/okf/     this bundle
```

# Start here

1. [The interactions adapter](concepts/interactions-adapter.md), then [the backend contract](concepts/backend-contract.md).
2. [The cast-reminder Worker](concepts/cast-reminder-worker.md).
3. [Run locally](runbooks/run-locally.md), [deploy](runbooks/deploy.md).
4. Before a change: [code style](conventions/code-style.md), the [decisions](decisions/index.md) and the [pitfalls](pitfalls/index.md).

# Contributing

The maintainers build with AI coding agents and review every pull request before it merges. Almost every Discord feature is backend work; a change lands here only when the handshake with Discord or the reminder schedule changes.
