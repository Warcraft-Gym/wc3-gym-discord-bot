// Calls the backend's cast-reminder job. Vercel Hobby fires a cron once a day,
// so the schedule lives here. A failed call throws, so it shows in Cron Events.
export default {
  async scheduled(_controller, env) {
    const response = await fetch(`${env.BACKEND_API_URL}/jobs/cast-reminders`, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`cast-reminders answered ${response.status}: ${body}`);
    }
    console.log(`cast-reminders: ${body}`);
  },
};
