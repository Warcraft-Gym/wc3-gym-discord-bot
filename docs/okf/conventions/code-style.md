---
type: Convention
title: Code style
description: One Python file on the standard library and Starlette, formatted and linted by ruff, with a Worker in plain JavaScript beside it.
resource: ../../../pyproject.toml
tags: [tooling]
generated: { by: claude-code/claude-fable-5-1, at: 2026-09-14T10:00:00Z }
sources:
  - id: pyproject
    resource: ../../../pyproject.toml
    title: Dependencies and ruff
  - id: justfile
    resource: ../../../justfile
    title: The recipes
---

- Python 3.13, managed by `uv`. `uv run just test` runs pytest; `uv run just lint` runs `ruff check` and `ruff format --check`.
- The adapter is one module, `app.py`, on Starlette and the standard library's `urllib`. It carries no HTTP client library, no bot token and no command list. Everything that knows a command lives in the backend.
- The adapter reads its two environment values at import, so the test module sets them before importing it.
- The Worker in `cron/` is one ES module with one test file on node's own runner. Wrangler is pinned to a 3.x version because 4.x needs a newer Node than the machines that run it.
- Comments describe the current state on one line, in the present tense. Prose uses short plain sentences; see [the writing rule](okf-bundle.md).
- Every pull request is one branch and one squash merge into `main`, with the same branch prefixes and attribution rules as the backend: `feature/`, `fix/`, `refactor/`, `chore/`; an agent's text in a pull request body says so; a co-written commit ends with a `Co-Authored-By` trailer; never override the author; never a closing keyword on an issue.
