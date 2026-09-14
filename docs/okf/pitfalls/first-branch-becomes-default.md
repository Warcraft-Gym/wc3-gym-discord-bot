---
type: Pitfall
title: The first pushed branch becomes the default
description: An empty GitHub repository has no default branch; whatever is pushed first becomes it, and a feature branch pushed before main makes every later pull request target the wrong base.
tags: [tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: source
    resource: Maintainers' observation, 2026-09-06
    title: Creating this repository
---

# What happened

This repository was created empty and the adapter was developed on a feature branch. Pushing that branch first would have made it the default branch, so that every pull request opened afterwards would target it instead of `main`.

# The rule

Push `main` first, even with one commit, then the feature branch. In a new repository, check the default branch in the repository settings before opening the first pull request. If a wrong branch is already the default, change it in the settings and retarget the open pull requests with `gh pr edit <n> --base main`.
