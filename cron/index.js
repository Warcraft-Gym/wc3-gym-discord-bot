// Runs the cast-reminder job on every fifth minute and probes /health on the others.
export default {
  async scheduled(controller, env) {
    const at = controller?.scheduledTime ?? Date.now();
    const job = new Date(at).getUTCMinutes() % 5 === 0;
    if (job) {
      const body = await call("cast-reminders", `${env.BACKEND_API_URL}/jobs/cast-reminders`, {
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      });
      console.log(`cast-reminders: ${body}`);
    } else {
      await call("health", `${env.BACKEND_API_URL}/health`);
    }
  },
};

// Throws on a failed call, so the failure shows in Cron Events.
async function call(name, url, options) {
  const response = await fetch(url, options);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${name} answered ${response.status}: ${body}`);
  }
  return body;
}
