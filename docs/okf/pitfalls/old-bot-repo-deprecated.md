---
type: Pitfall
title: The old bot repository is not this one
description: An older discord.js bot repository on the Flask and Azure stack still exists in the organisation; it is deprecated, and no change or pull request goes there.
tags: [pitfall, repository]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: Maintainers' decision, 2026-09-12
    title: Which repository is the Discord integration
---

# What happened

The organisation holds an older Discord bot, written in JavaScript against the previous Flask backend on Azure. A search for a stale configuration key found a hit only in that repository, and a change was proposed there. That repository serves the old stack, and nothing built now runs through it.

# The rule

The Discord integration is this repository plus the backend's interaction routes. A finding that exists only in the old repository is not a bug to fix. Never open a pull request there. The old bot is outside this app's development.
