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
