---
type: Domain Concept
title: The interactions adapter
description: Discord posts every interaction here; the adapter verifies the signature, answers inside the 3 second window, and forwards the payload unchanged to the backend, which does the work.
resource: ../../../app.py
tags: [discord]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T17:00:00Z }
sources:
  - id: app
    resource: ../../../app.py
    title: The adapter
  - id: tests
    resource: ../../../tests/test_app.py
    title: The adapter's whole contract as tests
---

# The flow

1. Discord sends a POST to `/interactions` with the body signed over `timestamp + body`, in the headers `X-Signature-Ed25519` and `X-Signature-Timestamp`.
2. The adapter verifies the signature with the application's public key, `DISCORD_PUBLIC_KEY`. A bad or missing signature answers 401 and nothing else happens.
3. A PING (type 1) answers PONG (type 1). That is what the Developer Portal sends when the endpoint URL is saved.
4. An autocomplete (type 4) has no deferred form. The adapter forwards it and waits up to 2 seconds inside the window; a slow or cold backend gets an empty choice list, which beats no answer.
5. Everything else (a command, a button press) answers at once with a deferred private reply (type 5, ephemeral flag), and a background task forwards the payload to the backend after the response is sent. The backend edits the deferred reply through the interaction token, or posts a public follow-up in the channel.

# The forward

`BACKEND_URL` names the backend route in full. The body and the two signature headers go across unchanged, so the backend verifies the same signature again and trusts nothing but Discord. The forward waits up to 60 seconds, the backend's own function limit.

When the forward fails outright (a refused connection, an HTTP error), the backend will never edit the reply, so the adapter edits it itself with a short "try again" text, through the interaction token. A read timeout is left alone: the backend may be mid-write and will edit the reply itself. The adapter needs no bot token for either, because the interaction token is the whole authorisation.

# What the adapter does not know

No command name, no option, no reply text, no database. Adding a command is a backend change; the adapter changes only when the handshake with Discord changes. See [the backend contract](backend-contract.md).

# Why it exists

The backend takes about 4 seconds to cold-start, past Discord's window. A one-file Starlette function starts in under a second. See [the decision](../decisions/separate-starlette-adapter.md).

# Examples

A slash command arrives, is acknowledged inside the window, and is forwarded unchanged:

```http
POST /interactions
X-Signature-Ed25519: <hex signature over timestamp + body>
X-Signature-Timestamp: <unix seconds>

{"type": 2, "data": {"name": "upcoming"}}

200 OK
{"type": 5, "data": {"flags": 64}}
```

Then, after the response is sent: `POST $BACKEND_URL` with the same body and the same two headers. A PING `{"type": 1}` answers `{"type": 1}` at once and is never forwarded. A bad signature answers `401`.
