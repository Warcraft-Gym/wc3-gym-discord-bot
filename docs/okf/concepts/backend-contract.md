---
type: Integration
title: The backend contract, as consumed here
description: The two backend routes this repository calls, the one Worker route the backend calls, the headers they need, and the environment values on each side.
resource: ../../../app.py
tags: [backend]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-23T06:10:00Z }
sources:
  - id: app
    resource: ../../../app.py
    title: The forward
  - id: worker
    resource: ../../../cron/index.js
    title: The job call and the push route
---

The backend repository, `wc3-gym-backend`, owns those two routes and every command, card and reply. This file says only what this repository sends, and the one route the Worker serves to the backend.

| Route | Sent by | Headers | Answer relied on |
|---|---|---|---|
| `POST /discord/interactions` | the adapter | `Content-Type: application/json`, `X-Signature-Ed25519`, `X-Signature-Timestamp`, the body as Discord sent it | for an autocomplete, the JSON to relay as is; for everything else, nothing, because the backend edits the deferred reply itself |
| `GET /jobs/cast-reminders` | the Worker | `Authorization: Bearer <CRON_SECRET>` | a 2xx; the body is logged, and its `next_run` is kept |

# The call the backend makes

| Route | Sent by | Headers | Body | Answers |
|---|---|---|---|---|
| `POST /next-run` on the Worker's own URL | the backend, whenever a claim, a series time, a cup or a cup round changes | `Authorization: Bearer <CRON_SECRET>`, the Worker's own secret in the other direction | `{"next_run": "<ISO 8601 with offset>"}` | 204 when stored, or dropped without the `STATE` binding; 401 on a missing or wrong bearer; 400 on a body that is not JSON or has no parseable `next_run` string; 404 on any other path or method |

The Worker clamps the stored time to at most 24 hours ahead, the same clamp it applies to the `next_run` in the answer of `GET /jobs/cast-reminders`.

# Environment values

| Where | Name | Meaning |
|---|---|---|
| the adapter | `DISCORD_PUBLIC_KEY` | the application's public key from the Developer Portal; the backend holds the same value |
| the adapter | `BACKEND_URL` | the interactions route in full |
| the Worker | `BACKEND_API_URL` | the backend origin |
| the Worker | `CRON_SECRET` | the bearer the backend's cast-reminder route checks, which the backend holds as `CLOUDFLARE_CRON_SECRET`, and the bearer the Worker checks on the backend's push |

The backend answers 503 on the interactions route while its own copy of the public key is unset, and on the cast-reminder route while its own copy of that secret is unset. A 503 from the forward means a backend configuration gap, not an adapter fault.
