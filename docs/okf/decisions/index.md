# Decisions

* [A separate one-file Starlette app](separate-starlette-adapter.md) - The interactions endpoint is its own repository and Vercel project, one Starlette route on the standard library, because the backend cold-starts past Discord's window.
* [The adapter holds no bot token](no-bot-token.md) - The adapter talks to Discord only through the interaction token of the request it is handling, so a leak of this project leaks nothing that can act as the bot.
* [The five-minute cron runs on Cloudflare](cron-outside-vercel.md) - The cast-reminder schedule is a Cloudflare Worker in this repository, because the backend's Vercel plan allows one cron a day.
