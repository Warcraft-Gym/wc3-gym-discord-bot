---
type: Pitfall
title: A failed forward must clear the reply, a timed-out one must not
description: A forward that fails outright leaves the deferred reply spinning until the token expires, so the adapter edits it; a read timeout means the backend may still be mid-write, so the adapter leaves it alone.
tags: [pitfall, discord, timeout]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: app
    resource: ../../../app.py
    title: forward_later()
  - id: tests
    resource: ../../../tests/test_app.py
    title: The failure and timeout tests
---

# What happened

The first adapter answered the deferred reply and forwarded, with nothing on the failure path. When the backend refused the connection, nobody edited the deferred reply, so the member watched it spin until the interaction token expired 15 minutes later.

# The rule

`forward_later` edits the deferred reply with a short "try again" text only when the forward fails outright: a refused connection, a DNS failure, an HTTP error. A `TimeoutError` is logged and left alone, because the forward's timeout equals the backend's own function limit; a timeout means the backend is at its limit and may still edit the reply itself. Two edits of the same reply would show the member two contradicting messages. The edit uses the interaction token, so the adapter still holds no bot token. Tests in `tests/test_app.py` pin both branches.
