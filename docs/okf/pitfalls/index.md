# Pitfalls

* [A failed forward must clear the reply, a timed-out one must not](read-timeout-left-alone.md) - A forward that fails outright leaves the deferred reply spinning until the token expires, so the adapter edits it; a read timeout means the backend may still be mid-write, so the adapter leaves it alone.
* [The first pushed branch becomes the default](first-branch-becomes-default.md) - An empty GitHub repository has no default branch; whatever is pushed first becomes it, and a feature branch pushed before main makes every later pull request target the wrong base.
* [The old bot repository is not this one](old-bot-repo-deprecated.md) - An older discord.js bot repository on the Flask and Azure stack still exists in the organisation; it is deprecated, and no change or pull request goes there.
* [The staging Worker inherited the production schedule](staging-worker-ran-the-cron.md) - Wrangler environments inherit triggers, so the staging Worker ran the five-minute reminder cron; the staging environment now sets an empty cron list on purpose.
* [Wrangler 4 needs a newer Node than the machines that deploy](wrangler-version.md) - The cron justfile pins wrangler 3.114.17 because wrangler 4 requires Node 22, and a bare npx wrangler picks the latest and fails on an older Node.
