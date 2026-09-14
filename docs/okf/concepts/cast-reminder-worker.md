---
type: Domain Concept
title: The cast-reminder Worker
description: A Cloudflare Worker calls the backend's reminder job every five minutes, because the backend's hosting plan runs one cron a day.
resource: ../../../cron/index.js
tags: [worker, deploy]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
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

On every scheduled run the Worker sends `GET <BACKEND_API_URL>/jobs/cast-reminders` with `Authorization: Bearer <CRON_SECRET>`. A refused or failed call throws, so the failure shows in the Worker's Cron Events; a good call logs the backend's answer.

# Two environments

| Environment | Name | Schedule | Backend |
|---|---|---|---|
| production | `wc3-gym-cast-reminders` | every five minutes | the production backend |
| staging | `wc3-gym-cast-reminders-staging` | none; run on demand with `wrangler dev --test-scheduled` | the staging backend alias |

`triggers` is an inheritable key in the Wrangler configuration, so the staging environment sets an empty cron list on purpose; without it the production schedule would apply there too.

# Secrets

`CRON_SECRET` is a Worker secret, never a plain variable, set by `just cron deploy` from the environment. It is the same value the backend checks. `BACKEND_API_URL` is a plain variable per environment.

# Deploy

`deploy-cron.yml` runs `just cron test` and `just cron deploy` for both environments on every merge that touches `cron/`. It needs the repository secrets for the Cloudflare token, the account id and the cron secret. By hand: `cd cron && just deploy staging`. Watch a run with `npx wrangler@3 tail` in `cron/`, with `--env staging` for staging.
