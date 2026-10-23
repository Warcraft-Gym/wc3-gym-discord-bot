// Ticks every minute and calls the backend's reminder job once the next_run kept in the STATE KV
// namespace has come; the backend sets it in its answer and pushes it to POST /next-run.
// Without the binding, while nothing is stored, or once the stored time is more than STALE_MS past,
// the Worker calls on every fifth minute; without the binding pushes are dropped.
const NEXT_RUN = "next_run";
const MAX_SLEEP_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 10 * 60 * 1000;

// The next_run of a JSON body as epoch ms, NaN when the body has no parseable one.
function nextRunOf(text) {
  try {
    const value = JSON.parse(text).next_run;
    return typeof value === "string" ? Date.parse(value) : NaN;
  } catch {
    return NaN;
  }
}

// KV writes are the scarce quota, reads are not: a time already stored is not written again, and
// an answer without next_run clears the stored time only when there is one.
async function remember(env, at, now) {
  if (!env.STATE) return;
  const stored = await env.STATE.get(NEXT_RUN);
  if (!Number.isFinite(at)) {
    if (stored !== null) await env.STATE.delete(NEXT_RUN);
    return;
  }
  const value = new Date(Math.min(at, now + MAX_SLEEP_MS)).toISOString();
  if (value !== stored) await env.STATE.put(NEXT_RUN, value);
}

async function due(env, now) {
  const stored = env.STATE ? Date.parse((await env.STATE.get(NEXT_RUN)) ?? "") : NaN;
  if (Number.isNaN(stored) || now - stored > STALE_MS) {
    return new Date(now).getUTCMinutes() % 5 === 0;
  }
  return now >= stored;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/next-run") {
      return new Response(null, { status: 404 });
    }
    // ponytail: plain comparison, not timing-safe
    if (!env.CRON_SECRET || request.headers.get("Authorization") !== `Bearer ${env.CRON_SECRET}`) {
      return new Response(null, { status: 401 });
    }
    const at = nextRunOf(await request.text());
    if (!Number.isFinite(at)) return new Response(null, { status: 400 });
    await remember(env, at, Date.now());
    return new Response(null, { status: 204 });
  },

  async scheduled(controller, env) {
    const now = controller?.scheduledTime ?? Date.now();
    if (!(await due(env, now))) return;
    const response = await fetch(`${env.BACKEND_API_URL}/jobs/cast-reminders`, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`cast-reminders answered ${response.status}: ${body}`);
    console.log(`cast-reminders: ${body}`);
    await remember(env, nextRunOf(body), now);
  },
};
