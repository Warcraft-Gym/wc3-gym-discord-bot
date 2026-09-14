---
type: Decision
title: The five-minute cron runs on Cloudflare
description: The cast-reminder schedule is a Cloudflare Worker in this repository, because the backend's Vercel plan allows one cron a day.
tags: [worker, deploy]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: worker
    resource: ../../../cron/index.js
    title: The Worker
  - id: source
    resource: Maintainers' decision, 2026-09-09
    title: Where the schedule lives
---

# Decision

The backend exposes the reminder job as `GET /jobs/cast-reminders`, guarded by a bearer secret. The schedule that calls it every five minutes is a Cloudflare Worker in `cron/`, deployed by this repository's workflow.

# Why

- The backend's Vercel Hobby plan runs a cron at most once a day, and a more frequent schedule in `vercel.json` fails the whole deployment.
- A Worker's cron trigger is free at this volume, runs from Cloudflare's edge, and lists every run with its result.
- This repository already owns the Discord side of the app, so the reminder cadence sits with the other Discord plumbing rather than in a fourth repository.

# Consequences

- The backend stays the only place that knows what a reminder is. The Worker sends one request and reports the status.
- Staging has a Worker with no schedule, because a schedule there would post duplicate reminders. See [the Worker](../concepts/cast-reminder-worker.md).
- Wrangler is pinned to a 3.x version. See [the pitfall](../pitfalls/wrangler-version.md).
