---
type: Pitfall
title: Wrangler 4 needs a newer Node than the machines that deploy
description: The cron justfile pins wrangler 3.114.17 because wrangler 4 requires Node 22, and a bare npx wrangler picks the latest and fails on an older Node.
tags: [deploy, tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: cron-justfile
    resource: ../../../cron/justfile
    title: The pin
  - id: workflow
    resource: ../../../.github/workflows/deploy-cron.yml
    title: CI on Node 22
---

# What happened

A bare `npx wrangler` resolved to the 4.x line, which refuses to run on Node below 22. The same command worked in CI on Node 22, so the failure showed only locally and looked like a broken install.

# The rule

Call wrangler only through the `wrangler` variable in `cron/justfile`, which pins `npx --yes wrangler@3.114.17`. The README's `tail` commands carry the same pin. To move to wrangler 4, raise Node on every machine that deploys first, then change the one pin. `triggers` is inheritable across Wrangler environments, so keep the explicit empty cron list on the staging environment through any upgrade.
