---
type: Domain Concept
title: The cast-reminder Worker
description: A Cloudflare Worker, not a Vercel cron, ticks every minute and calls the backend's reminder job once the next run the backend answered or pushed has come.
resource: ../../../cron/index.js
tags: [worker, deploy]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-23T06:10:00Z }
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

A tick that calls sends `GET <BACKEND_API_URL>/jobs/cast-reminders` with `Authorization: Bearer <CRON_SECRET>`. A refused or failed call throws, so the failure shows in the Worker's Cron Events; a good call logs the backend's answer.

# Skipping idle ticks

The cron trigger fires every minute. The backend answers `next_run`, the soonest time a reminder card or a cup call can fall due. With a KV namespace bound as `STATE`, the Worker stores that time under the key `next_run` and returns without a call on every tick before it. A tick at or after it calls again and stores the new answer, and an answer without `next_run` clears the stored one. Every stored time is clamped to at most 24 hours after it is written, so the Worker calls at least once a day. Without the `STATE` binding, or while nothing is stored in it, the Worker calls on every fifth minute, so a backend that answers no `next_run` is called as it was before the binding.

Each environment binds its own namespace: `kv_namespaces` is not inherited. Create one with `npx wrangler@3.114.17 kv namespace create STATE` in `cron/`, with `--env staging` for staging, and add the binding to `wrangler.jsonc` with the id it prints.

# The backend's push

Whenever a claim, a series time, a cup or a cup round changes, the backend sends `POST /next-run` to the Worker's own URL with `Authorization: Bearer <CRON_SECRET>` and the body `{"next_run": "<ISO 8601 with offset>"}`. The Worker stores the time under `next_run` with the same clamp and answers 204. It answers 401 to a missing or wrong bearer, 400 to a body that is not JSON or has no parseable `next_run` string, and 404 to any other path or method. Without the `STATE` binding it answers 204 and drops the push. The push arrives on the Worker's `workers.dev` URL, so that route stays enabled, which is the default.

# Two environments

| Environment | Name | Schedule | Backend |
|---|---|---|---|
| production | `wc3-gym-cast-reminders` | every minute | the production backend |
| staging | `wc3-gym-cast-reminders-staging` | every minute | the staging backend alias |

`triggers` is an inheritable key in the Wrangler configuration, so each environment states its own cron list, even where it matches production's. Each Worker calls its own backend, and that backend posts in the channels its own settings name, so a staging run posts real Discord messages.

# Secrets

`CRON_SECRET` is a Worker secret, never a plain variable, set per Worker in the Cloudflare dashboard under Settings, Variables and Secrets. Each Worker has its own value: the production Worker's matches `CLOUDFLARE_CRON_SECRET` on the backend's Production target, the staging Worker's matches it on Preview. The backend checks it on the cast-reminder route only, and sends the same value as the bearer of its push. A deploy keeps it; a new or re-created Worker starts without it, and until it is set the backend answers 401 and the Worker refuses every push with 401. `BACKEND_API_URL` is a plain variable per environment.

# Deploy

`deploy-cron.yml` runs `just cron test` and `just cron deploy` for both environments on every merge that touches `cron/`. It needs the repository secrets for the Cloudflare token and the account id. By hand: `cd cron && just deploy staging`. Watch a run with `npx wrangler@3.114.17 tail` in `cron/`, with `--env staging` for staging.
