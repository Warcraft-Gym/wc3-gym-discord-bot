# Runbooks

* [Deploy the adapter and the Worker](deploy.md) - The adapter deploys to Vercel with just deploy; the Worker deploys to Cloudflare from a GitHub workflow on merge, or by hand with just cron deploy.
* [Run the adapter locally](run-locally.md) - Install with uv, put the two values in .env, serve on port 5004, and send a signed request from the tests.
