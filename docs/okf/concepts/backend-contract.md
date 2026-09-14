---
type: Integration
title: The backend contract, as consumed here
description: The two backend routes this repository calls, the headers they need, and the environment values on each side.
resource: ../../../app.py
tags: [backend]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: app
    resource: ../../../app.py
    title: The forward
  - id: worker
    resource: ../../../cron/index.js
    title: The job call
---

The backend repository, `wc3-gym-backend`, owns both routes and every command, card and reply. This file says only what this repository sends.

| Route | Sent by | Headers | Answer relied on |
|---|---|---|---|
| `POST /discord/interactions` | the adapter | `Content-Type: application/json`, `X-Signature-Ed25519`, `X-Signature-Timestamp`, the body as Discord sent it | for an autocomplete, the JSON to relay as is; for everything else, nothing, because the backend edits the deferred reply itself |
| `GET /jobs/cast-reminders` | the Worker | `Authorization: Bearer <CRON_SECRET>` | a 2xx; the body is logged |

# Environment values

| Where | Name | Meaning |
|---|---|---|
| the adapter | `DISCORD_PUBLIC_KEY` | the application's public key from the Developer Portal; the backend holds the same value |
| the adapter | `BACKEND_URL` | the interactions route in full |
| the Worker | `BACKEND_API_URL` | the backend origin |
| the Worker | `CRON_SECRET` | the bearer the backend's job routes check |

The backend answers 503 on the interactions route while its own copy of the public key is unset, and on every job route while its cron secret is unset. A 503 from the forward means a backend configuration gap, not an adapter fault.
