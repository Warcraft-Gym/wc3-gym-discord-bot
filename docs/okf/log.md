# Bundle history

## 2026-10-06

* **Update**: every concept was read against the code. Git deploys only `main` and `staging`, so a pull request gets no preview; the staging Worker configuration runs on demand with `--env staging`; the adapter app has two routes; the bundle test also refuses sensitive content. [Overview](overview.md), [deploy](runbooks/deploy.md), [run locally](runbooks/run-locally.md), [the Worker](concepts/cast-reminder-worker.md), [the staging pitfall](pitfalls/staging-worker-ran-the-cron.md), [the adapter decision](decisions/separate-starlette-adapter.md), [bundle rules](conventions/okf-bundle.md).
* **Update**: Vercel builds only `main`; no push builds a preview. [Overview](overview.md), [deploy](runbooks/deploy.md).

## 2026-09-14

* **Update**: a tag vocabulary per area, enforced by the test; `resource` and `stale_after` where they apply; `# Examples` on the session answer, the error envelope, the paged list and the result report; a Start here by question guide that doubles as the benchmark; `just okf-drift`.
* **Update**: a pass with two third-party OKF validators: the descriptions YAML misread are quoted, every concept bound to a file or a vendor carries `resource`, the runbooks carry `stale_after`, the root index carries the overview's own description, and the bundle test now checks the index lines, the tags list and unquoted values.
* **Creation**: Established the bundle: conventions, concepts, runbooks, decisions and pitfalls, written from the code on `main`, the README, and the maintainers' recorded decisions. Every concept is `generated` by an agent and carries no `verified` entry yet.
