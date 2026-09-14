---
type: Guide
title: Start here by question
description: The questions a new contributor or an agent asks first, each with the concept that answers it; the list is also the benchmark the bundle is read against.
tags: [tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T17:00:00Z }
sources:
  - id: index
    resource: index.md
    title: The bundle map
---

# Questions

- What does the adapter do with a slash command or a button press? [The interactions adapter](concepts/interactions-adapter.md).
- Why is the adapter a separate app and not a backend route? [A separate Starlette adapter](decisions/separate-starlette-adapter.md).
- Why does the adapter hold no bot token? [No bot token](decisions/no-bot-token.md).
- What does the cast reminder send, and when? [The cast reminder worker](concepts/cast-reminder-worker.md).
- Why does the cron run on Cloudflare and not on Vercel? [Cron outside Vercel](decisions/cron-outside-vercel.md).
- Which backend routes does this repository call? [The backend contract](concepts/backend-contract.md).
- How do I run it on my machine? [Run locally](runbooks/run-locally.md).
- How do I deploy the adapter and the worker? [Deploy](runbooks/deploy.md).
- Which repository is the old bot? [The old bot repository](pitfalls/old-bot-repo-deprecated.md).

# The benchmark

A reader who starts at [the bundle map](index.md) should reach each answer in two hops: the map names the directory, the directory index names the concept. When a question here misses, the fix is the index line, not this list.
