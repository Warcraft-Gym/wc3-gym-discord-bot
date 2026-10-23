# Concepts

* [The backend contract, as consumed here](backend-contract.md) - The two backend routes this repository calls, the one Worker route the backend calls, the headers they need, and the environment values on each side.
* [The cast-reminder Worker](cast-reminder-worker.md) - A Cloudflare Worker, not a Vercel cron, ticks every minute and calls the backend's reminder job once the next run the backend answered or pushed has come.
* [The interactions adapter](interactions-adapter.md) - Discord posts every interaction here; the adapter verifies the signature, answers inside the 3 second window, and forwards the payload unchanged to the backend, which does the work.
