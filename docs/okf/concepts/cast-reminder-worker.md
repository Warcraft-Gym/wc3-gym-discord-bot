---
type: Domain Concept
title: The cast-reminder Worker
description: A Cloudflare Worker, not a Vercel cron, calls the backend's reminder job every five minutes and its health route on the minutes between, so the backend stays warm.
resource: ../../../cron/index.js
tags: [worker, deploy]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-23T03:12:19Z }
sources:
  - id: worker
    resource: ../../../cron/index.js
    title: The Worker
  - id: config
    resource: ../../../cron/wrangler.jsonc
    title: The schedule and the two environments
  - id: tests
    resource: ../../../cron/index.test.js
    title: The Worker's tests
---

# What it does

Each scheduled run reads the minute of its scheduled time, in UTC.

- On a minute that is a multiple of five, the Worker sends `GET <BACKEND_API_URL>/jobs/cast-reminders` with `Authorization: Bearer <CRON_SECRET>` and logs the backend's answer.
- On every other minute, it sends `GET <BACKEND_API_URL>/health` with no header and logs nothing.

A refused or failed call throws, so the failure shows in the Worker's Cron Events.

# Two environments

| Environment | Name | Schedule | Backend |
|---|---|---|---|
| production | `wc3-gym-cast-reminders` | every minute | the production backend |
| staging | `wc3-gym-cast-reminders-staging` | none | the staging backend alias |

`triggers` is an inheritable key in the Wrangler configuration, so each environment states its own cron list, even an empty one. Each Worker calls its own backend, and that backend posts in the channels its own settings name, so a staging run posts real Discord messages.

To test the reminder flow on staging, add the cron `*/5 * * * *` to the staging Worker in the Cloudflare dashboard, under Settings, Trigger Events. Every run on that schedule calls the job. Delete the cron when the test ends. The next deploy of the staging Worker also removes it, because the deploy sets the schedule from the configuration.

# Keeping the backend warm

The backend runs as one Vercel function. Vercel pauses an instance after its requests finish and reuses it for the next call while it still exists. After a gap of five minutes the instance is often gone, and the next call starts cold. A cold start costs about 3.7 s of CPU; a warm call of the health route costs far less. A run every minute keeps the gap between calls at one minute. The probe relies on the health route answering from the function on every call, never from a cache.

Since 2026-10-23 production runs every minute, because cold starts use more of the backend's CPU time than the calls do. Since 2026-10-23 staging runs no schedule by default, because its runs start the backend cold when no test is in progress.

# Secrets

`CRON_SECRET` is a Worker secret, never a plain variable, set per Worker in the Cloudflare dashboard under Settings, Variables and Secrets. Each Worker has its own value: the production Worker's matches `CLOUDFLARE_CRON_SECRET` on the backend's Production target, the staging Worker's matches it on Preview. The backend checks it on the cast-reminder route only. A deploy keeps it; a new or re-created Worker starts without it, and the backend answers 401 until it is set. `BACKEND_API_URL` is a plain variable per environment.

# Deploy

`deploy-cron.yml` runs `just cron test` and `just cron deploy` for both environments on every merge that touches `cron/`. It needs the repository secrets for the Cloudflare token and the account id. By hand: `cd cron && just deploy staging`. Watch a run with `npx wrangler@3.114.17 tail` in `cron/`, with `--env staging` for staging.
