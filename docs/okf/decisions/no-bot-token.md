---
type: Decision
title: The adapter holds no bot token
description: The adapter talks to Discord only through the interaction token of the request it is handling, so a leak of this project leaks nothing that can act as the bot.
tags: [decision, discord, security]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: app
    resource: ../../../app.py
    title: tell()
---

# Decision

The adapter's only Discord credential is the application's public key, which verifies signatures and can sign nothing. When the adapter must edit a reply itself, it uses the interaction token in the payload, through the webhook route `PATCH /webhooks/{application_id}/{token}/messages/@original`. That token is valid for 15 minutes and for that one interaction.

# Why

- The bot token can post in any channel, manage roles and read history. The adapter needs none of that.
- The backend already holds the bot token and does every write that needs it. Two copies of a secret double the places it can leak.
- The interaction token is enough for the one thing the adapter does on its own: telling the member that the backend did not answer.

# Consequences

- A new feature that needs the bot token is backend work, whatever it looks like from Discord's side.
- The adapter's environment is two values. See [the backend contract](../concepts/backend-contract.md).
