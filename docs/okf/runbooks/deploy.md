---
type: Runbook
title: Deploy the adapter and the Worker
description: The adapter deploys to Vercel with just deploy; the Worker deploys to Cloudflare from a GitHub workflow on merge, or by hand with just cron deploy.
tags: [runbook, deploy, vercel, cloudflare]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: justfile
    resource: ../../../justfile
    title: just deploy
  - id: cron-justfile
    resource: ../../../cron/justfile
    title: just cron deploy
  - id: workflow
    resource: ../../../.github/workflows/deploy-cron.yml
    title: The Worker workflow
---

# The adapter

The Vercel project is linked to this repository. A push to `main` deploys production; a pull request deploys a preview. By hand, from the linked checkout:

```
just deploy staging   # a preview from the working tree
just deploy           # promotes the working tree to production
```

The project holds `DISCORD_PUBLIC_KEY` and `BACKEND_URL` as environment values. `vercel.json` sets `maxDuration` to 60 seconds so the background forward is not cut. After the first deploy, paste the production URL plus `/interactions` into the Interactions Endpoint URL field of the Discord Developer Portal; the save succeeds when the adapter answers the PING.

# The Worker

Every merge that touches `cron/` runs `deploy-cron.yml`: `just cron test`, then `just cron deploy staging`, then `just cron deploy prod`. The workflow reads three repository secrets: a Cloudflare API token with Worker edit rights, the Cloudflare account id, and the cron secret the backend checks. Run the workflow by hand from the Actions tab with `workflow_dispatch`.

By hand, with the same three values in the environment:

```
just cron deploy staging
just cron deploy
```

`just cron deploy` deploys, then writes `CRON_SECRET` as a Worker secret from the environment. It refuses to run when the value is unset.

# Check a deploy

- The adapter: `GET /health` answers `{"ok": true}`. A real check is a slash command in the guild.
- The Worker: `cd cron && npx wrangler@3 tail` streams the next scheduled run. Cron Events in the Cloudflare dashboard list every run and whether it threw.
