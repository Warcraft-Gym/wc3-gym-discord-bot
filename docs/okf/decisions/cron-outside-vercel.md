---
type: Decision
title: The reminder cron runs on Cloudflare
description: The cast-reminder schedule is a Cloudflare Worker in this repository, not a schedule in the backend's `vercel.json`.
tags: [worker, deploy]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-23T06:10:00Z }
sources:
  - id: worker
    resource: ../../../cron/index.js
    title: The Worker
  - id: source
    resource: Maintainers' decision, 2026-09-09
    title: Where the schedule lives
  - id: staging
    resource: Maintainers' decision, 2026-10-15
    title: Staging runs the same schedule
  - id: push
    resource: Maintainers' decision, 2026-10-23
    title: The backend pushes the next run
---

# Decision

The backend exposes the reminder job as `GET /jobs/cast-reminders`, guarded by a bearer secret. The schedule that calls it is a Cloudflare Worker in `cron/`, deployed by this repository's workflow. Since 2026-10-23 the Worker ticks every minute and calls only once the next run has come, and the backend pushes a new next run to the Worker with `POST /next-run` whenever a claim, a series time, a cup or a cup round changes.

# Why

- The backend's `vercel.json` keeps no schedule for the reminder job; the cadence the job needs comes from a Worker trigger, which runs from Cloudflare's edge and lists every run with its result.
- The backend pushes the next run rather than the Worker asking, because only the backend sees the writes that move it; a Worker that asked would wake the backend on every tick to learn of one.
- This repository already owns the Discord side of the app, so the reminder cadence sits with the other Discord plumbing rather than in a fourth repository.

# Consequences

- The backend stays the only place that knows what a reminder is. The Worker sends one request and reports the status.
- With no change the Worker calls the backend at least once a day; after a change it calls on the first tick at or after the new next run.
- Since 2026-10-15 the staging Worker runs the same schedule as production against the staging backend, so the reminder flow is tested on staging before a release. See [the Worker](../concepts/cast-reminder-worker.md).
- Wrangler is pinned to a 3.x version. See [the pitfall](../pitfalls/wrangler-version.md).
