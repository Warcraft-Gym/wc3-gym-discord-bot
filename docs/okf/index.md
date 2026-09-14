---
okf_version: "0.2"
---

# wc3-gym-discord-bot knowledge bundle

This directory is an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format) bundle for the Discord adapter of the Warcraft Gym league app. Start with [the repository overview](overview.md), then read the directory that fits your question. Every file is one concept with YAML frontmatter; [how this bundle is written](conventions/okf-bundle.md) explains the fields, the links and the rule for other repositories.

# Sections

* [Overview](overview.md) - The Discord interactions adapter of the Warcraft Gym league app, one Starlette route on Vercel, plus the Cloudflare Worker that calls the backend's reminder job every five minutes.
* [Start here by question](questions.md) - The questions a new contributor or an agent asks first, each with the concept that answers it; the list is also the benchmark the bundle is read against.
* [conventions](conventions/index.md) - The rules the code and the pull requests follow, and this bundle.
* [concepts](concepts/index.md) - The interactions adapter, the cast-reminder Worker, and the backend contract as consumed here.
* [runbooks](runbooks/index.md) - Run locally, deploy.
* [decisions](decisions/index.md) - What was decided, when, why, and what it means for new code.
* [pitfalls](pitfalls/index.md) - Mistakes made once, with the rule that avoids each.

# Neighbouring bundles

The app is three repositories. Each carries its own bundle at `docs/okf/`. This bundle names the others only through their contracts (routes, headers, environment variable names, payload shapes), never through a file path into them.

* `wc3-gym-backend` - https://github.com/Warcraft-Gym/wc3-gym-backend - the FastAPI backend that owns every command, reply, card and job this repository forwards to.
* `wc3-gym-frontend` - https://github.com/Warcraft-Gym/wc3-gym-frontend - the Vue web app.

# Other documents in this repository

* [README](../../README.md) - Setup, the two environment values, running, the Worker.
