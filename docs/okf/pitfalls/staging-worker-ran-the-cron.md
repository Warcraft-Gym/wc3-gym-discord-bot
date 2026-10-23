---
type: Pitfall
title: The staging Worker inherited the production schedule
description: Wrangler environments inherit triggers, so the staging Worker once ran the production cron without stating one; every environment now states its own cron list.
tags: [worker, deploy]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-23T06:10:00Z }
sources:
  - id: config
    resource: ../../../cron/wrangler.jsonc
    title: The cron list of each environment
---

# What happened

The staging Worker was added as a Wrangler environment with only its own backend URL. `triggers` is an inheritable key, so the staging Worker ran the production five-minute schedule against the staging backend, although its own environment stated no schedule.

# The rule

Every environment in `cron/wrangler.jsonc` states its own `triggers`, even when its cron list matches production's or is empty. The staging environment states `"triggers": { "crons": ["* * * * *"] }`, the production schedule written out. The staging Worker ticks every minute and calls the staging backend once its own stored next run has come, or on every fifth minute without its own `STATE` binding. Before you change the schedule of an environment, check which channels its backend's settings name, because each scheduled run can post in Discord.
