// The backend answers `next_run`, the soonest time a card or a call can fall due.
// Ticks before it are skipped, kept in the STATE KV namespace; without the binding
// every tick calls. A stored time further ahead than this is not trusted.
const NEXT_RUN = "next_run";
const MAX_SKIP_MS = 2 * 60 * 60 * 1000;

async function asleep(env, now) {
  if (!env.STATE) return false;
  const stored = Date.parse((await env.STATE.get(NEXT_RUN)) ?? "");
  return Number.isFinite(stored) && now < stored && stored - now <= MAX_SKIP_MS;
}

async function remember(env, body) {
  if (!env.STATE) return;
  let nextRun;
  try {
    nextRun = JSON.parse(body).next_run;
  } catch {
    return;
  }
  if (typeof nextRun === "string" && Number.isFinite(Date.parse(nextRun))) {
    await env.STATE.put(NEXT_RUN, nextRun);
  }
}

export default {
  async scheduled(controller, env) {
    const now = controller?.scheduledTime ?? Date.now();
    if (await asleep(env, now)) return;
    const response = await fetch(`${env.BACKEND_API_URL}/jobs/cast-reminders`, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`cast-reminders answered ${response.status}: ${body}`);
    console.log(`cast-reminders: ${body}`);
    await remember(env, body);
  },
};
