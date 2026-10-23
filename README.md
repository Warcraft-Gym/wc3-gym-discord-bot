# wc3-gym-discord-bot

The Discord interactions adapter for Warcraft Gym. Discord POSTs every slash command, button press and autocomplete to `/interactions`. The adapter checks Discord's Ed25519 signature, answers inside Discord's 3-second wall, and forwards the signed payload unchanged to the backend, which checks the same signature again and does the work. The adapter knows no command and holds no bot token.

It is one Starlette route on Vercel. A one-file Python function cold starts in about 0.85 s here, measured; the backend app takes 4 s, which is why this adapter exists.

## Environment

| name | value |
|---|---|
| `DISCORD_PUBLIC_KEY` | the app's Public Key from the Discord Developer Portal |
| `BACKEND_URL` | the backend route in full, e.g. `https://<backend>/discord/interactions` |

## Set up

1. Create the Vercel project from this repo. Vercel detects `app.py` and routes every path to it.
2. Set the two environment values on the project.
3. In the Developer Portal, set the Interactions Endpoint URL to `https://<project>.vercel.app/interactions`. Discord sends a PING; the save succeeds when the adapter answers it.

## Run

```
just test
just dev      # needs .env with the two values
just deploy staging
```

## Cast reminders

`cron/` is a Cloudflare Worker, one for prod and one for staging, each against its own backend. The prod Worker runs every minute. On every fifth minute it calls the backend's `GET /jobs/cast-reminders`; on the other minutes it probes `GET /health`, so the backend's function instance stays warm. A cold start costs about 3.7 s of CPU, and a warm probe far less. The staging Worker has no schedule. To test the reminder flow, add the cron `*/5 * * * *` to it in the Cloudflare dashboard under Settings, Trigger Events, and delete it when the test ends; the next deploy also removes it. Each run of the job can post in Discord, in the channels its backend's settings name. The workflow `deploy-cron.yml` runs `just cron test` and `just cron deploy` for both on every merge that touches `cron/`. It needs the repository secrets `CLOUDFLARE_WORKER_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Each Worker holds its own `CRON_SECRET`, set in the Cloudflare dashboard; the backend checks it as `CLOUDFLARE_CRON_SECRET`.

```
cd cron && npx wrangler@3.114.17 tail                  # watch prod runs
cd cron && npx wrangler@3.114.17 tail --env staging    # watch staging runs
```
