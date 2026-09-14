---
type: Decision
title: A separate one-file Starlette app
description: The interactions endpoint is its own repository and Vercel project, one Starlette route on the standard library, because the backend cold-starts past Discord's window.
tags: [decision, starlette, vercel]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: Measured cold starts, 2026-09-05 and 2026-09-06
    title: The adapter's cold start
  - id: readme
    resource: ../../../README.md
    title: README
---

# Decision

Discord posts to this repository, not to the backend. The adapter is one Starlette route that verifies, acknowledges and forwards. It is its own Vercel project, deployed from its own repository.

# Why

- Discord drops an interaction that is not answered within 3 seconds. Measured after idle, the backend app cold-starts in about 4 seconds; a one-file Python function cold-starts in about 0.85 seconds.
- The Vercel Python preset builds one function per project and routes every path to it, so a second small function cannot live in the backend project.
- Starlette was chosen over FastAPI because FastAPI's import alone costs about 0.4 seconds of the budget. `urllib` was chosen over an HTTP client library for the same reason: nothing to import.

# Consequences

- The adapter changes only when the handshake with Discord changes. Every command, reply and card is backend code.
- The backend verifies the same signature again, so the adapter is not a trust boundary the backend relies on.
- A Starlette background task on the response is the after-response hook on Vercel Python. The forward runs there, within the 60 second function limit. See [the adapter](../concepts/interactions-adapter.md).
