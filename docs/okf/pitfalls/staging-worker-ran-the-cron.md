---
type: Pitfall
title: The staging Worker inherited the production schedule
description: Wrangler environments inherit triggers, so the staging Worker ran the five-minute reminder cron; the staging environment now sets an empty cron list on purpose.
tags: [pitfall, cloudflare, wrangler, cron]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: config
    resource: ../../../cron/wrangler.jsonc
    title: The empty cron list
---

# What happened

The staging Worker was added as a Wrangler environment with only its own backend URL. `triggers` is an inheritable key, so the staging Worker ran the production five-minute schedule against the staging backend: 288 calls a day. A schedule there would post duplicate reminders.

# The rule

The staging environment in `cron/wrangler.jsonc` sets `"triggers": { "crons": [] }`. Keep that line through every change to the file. Run the staging Worker on demand with `wrangler dev --test-scheduled`. Any new Wrangler environment must state its own `triggers`, even an empty one.
