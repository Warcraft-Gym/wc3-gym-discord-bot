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

# How the Worker and the backend stay in step

The Worker keeps one value, `next_run`, in the KV namespace bound as `STATE`: the next time the reminder job has something to do. Two writers set it, and both take it from the same backend function, so they never disagree about the same database state:

- The backend answers it in the body of every job call.
- The backend pushes it, with `POST /next-run` to the Worker, whenever a commit changes a claim, a series time, a cup or a cup round.

The tick, every minute, follows these rules:

- Nothing stored, or a stored time more than ten minutes in the past: call on every fifth minute. This is the cadence from before the binding existed, and the fallback when a write failed or a call keeps failing.
- A stored time still ahead: return without a call.
- A stored time that has come: call, then store the answer.
- Every time written is clamped to at most 24 hours ahead, so the Worker calls at least once a day. An answer without `next_run` clears the stored time.

A time equal to the one already stored is not written again, so the writes in a day are the real changes of the next run.

The backend's answer carries two counts that show when the two sides fell out of step: `late`, cards posted more than two minutes after they were owed, and `missed`, claimed series that started without a card. Both should read 0. The Worker logs every answer.

# The push

`POST /next-run` on the Worker's own URL, with `Authorization: Bearer <CRON_SECRET>` and the body `{"next_run": "<ISO 8601 with offset>"}`. The Worker answers 204 when stored, and also without a `STATE` binding, where it drops the time; 401 to a missing or wrong bearer; 400 to a body that is not JSON or has no parseable `next_run` string; 404 to any other path or method. The push arrives on the Worker's `workers.dev` URL, so that route stays enabled, which is the default.

Each environment binds its own namespace: `kv_namespaces` is not inherited. Create one with `npx wrangler@3.114.17 kv namespace create STATE` in `cron/`, with `--env staging` for staging, and add the binding to `wrangler.jsonc` with the id it prints.

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
