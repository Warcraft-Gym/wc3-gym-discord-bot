import assert from "node:assert/strict";
import test from "node:test";

import worker from "./index.js";

const env = { BACKEND_API_URL: "https://backend.example", CRON_SECRET: "s3cret" };
const DAY_MS = 24 * 60 * 60 * 1000;

function stubFetch(status, body) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: status < 400, status, text: async () => body };
  };
  return calls;
}

function memoryKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => void store.set(key, value),
    delete: async (key) => void store.delete(key),
  };
}

const at = (iso) => ({ scheduledTime: Date.parse(iso) });

function push(body, { auth = "Bearer s3cret", path = "/next-run", method = "POST" } = {}) {
  const headers = auth ? { Authorization: auth } : {};
  return new Request(`https://worker.example${path}`, { method, headers, body });
}

test("calls the job with the bearer", async () => {
  const calls = stubFetch(200, '{"posted": 1}');

  await worker.scheduled(at("2026-10-23T10:00:00Z"), env);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://backend.example/jobs/cast-reminders");
  assert.equal(calls[0].options.headers.Authorization, "Bearer s3cret");
});

test("a refused call throws, so Cron Events shows it", async () => {
  stubFetch(401, '{"error": "Unauthorized"}');

  await assert.rejects(
    worker.scheduled(at("2026-10-23T10:00:00Z"), env),
    /cast-reminders answered 401: {"error": "Unauthorized"}/,
  );
});

test("without STATE, calls only on every fifth minute", async () => {
  const calls = stubFetch(200, '{"posted": 0}');

  await worker.scheduled(at("2026-10-23T10:01:00Z"), env);
  assert.equal(calls.length, 0);

  await worker.scheduled(at("2026-10-23T10:05:00Z"), env);
  assert.equal(calls.length, 1);
});

test("keeps the next run the backend answers", async () => {
  stubFetch(200, '{"posted": 0, "cup_reminders": 0, "next_run": "2026-10-23T10:30:00+00:00"}');
  const STATE = memoryKv();

  await worker.scheduled(at("2026-10-23T10:00:00Z"), { ...env, STATE });

  assert.equal(STATE.store.get("next_run"), "2026-10-23T10:30:00.000Z");
});

test("skips a minute tick before the next run, and calls at it", async () => {
  const calls = stubFetch(200, '{"posted": 0}');
  const STATE = memoryKv({ next_run: "2026-10-23T10:31:00+00:00" });

  await worker.scheduled(at("2026-10-23T10:30:00Z"), { ...env, STATE });
  assert.equal(calls.length, 0);

  await worker.scheduled(at("2026-10-23T10:31:00Z"), { ...env, STATE });
  assert.equal(calls.length, 1);
});

test("a next run the backend answers is clamped to a day ahead", async () => {
  stubFetch(200, '{"posted": 0, "next_run": "2026-10-26T10:00:00+00:00"}');
  const STATE = memoryKv();

  await worker.scheduled(at("2026-10-23T10:00:00Z"), { ...env, STATE });

  assert.equal(STATE.store.get("next_run"), "2026-10-24T10:00:00.000Z");
});

test("an answer without a next run clears the stored one, then every fifth minute calls", async () => {
  const calls = stubFetch(200, '{"posted": 1, "cup_reminders": 0}');
  const STATE = memoryKv({ next_run: "2026-10-23T09:00:00+00:00" });

  await worker.scheduled(at("2026-10-23T10:00:00Z"), { ...env, STATE });
  assert.equal(calls.length, 1);
  assert.equal(STATE.store.has("next_run"), false);

  await worker.scheduled(at("2026-10-23T10:01:00Z"), { ...env, STATE });
  assert.equal(calls.length, 1);

  await worker.scheduled(at("2026-10-23T10:05:00Z"), { ...env, STATE });
  assert.equal(calls.length, 2);
});

test("a stored time more than ten minutes past falls back to every fifth minute", async () => {
  const calls = stubFetch(500, "down");
  const STATE = memoryKv({ next_run: "2026-10-23T10:00:00.000Z" });

  // still due: a failed call is retried on the next minute
  await assert.rejects(worker.scheduled(at("2026-10-23T10:04:00Z"), { ...env, STATE }));
  assert.equal(calls.length, 1);

  await worker.scheduled(at("2026-10-23T10:11:00Z"), { ...env, STATE });
  assert.equal(calls.length, 1);

  await assert.rejects(worker.scheduled(at("2026-10-23T10:15:00Z"), { ...env, STATE }));
  assert.equal(calls.length, 2);
});

test("a time already stored is not written again", async () => {
  const STATE = memoryKv({ next_run: "2026-10-23T10:30:00.000Z" });
  let puts = 0;
  const put = STATE.put;
  STATE.put = async (key, value) => {
    puts += 1;
    return put(key, value);
  };

  const same = await worker.fetch(push('{"next_run": "2026-10-23T10:30:00+00:00"}'), { ...env, STATE });
  assert.equal(same.status, 204);
  assert.equal(puts, 0);

  stubFetch(200, '{"posted": 0, "next_run": "2026-10-23T10:30:00+00:00"}');
  await worker.scheduled(at("2026-10-23T10:30:00Z"), { ...env, STATE });
  assert.equal(puts, 0);

  const moved = await worker.fetch(push('{"next_run": "2026-10-23T10:45:00+00:00"}'), { ...env, STATE });
  assert.equal(moved.status, 204);
  assert.equal(puts, 1);
  assert.equal(STATE.store.get("next_run"), "2026-10-23T10:45:00.000Z");
});

test("with STATE bound and nothing stored, calls only on every fifth minute", async () => {
  const calls = stubFetch(200, '{"posted": 0}');
  const STATE = memoryKv();

  await worker.scheduled(at("2026-10-23T10:01:00Z"), { ...env, STATE });
  assert.equal(calls.length, 0);

  await worker.scheduled(at("2026-10-23T10:05:00Z"), { ...env, STATE });
  assert.equal(calls.length, 1);
});

test("a push stores its next run and answers 204", async () => {
  const STATE = memoryKv();
  const nextRun = new Date(Date.now() + 60 * 60 * 1000);

  const response = await worker.fetch(
    push(JSON.stringify({ next_run: nextRun.toISOString() })),
    { ...env, STATE },
  );

  assert.equal(response.status, 204);
  assert.equal(STATE.store.get("next_run"), nextRun.toISOString());
});

test("a pushed next run is clamped to a day ahead", async () => {
  const STATE = memoryKv();
  const before = Date.now();

  const response = await worker.fetch(
    push(JSON.stringify({ next_run: new Date(before + 3 * DAY_MS).toISOString() })),
    { ...env, STATE },
  );

  assert.equal(response.status, 204);
  const stored = Date.parse(STATE.store.get("next_run"));
  assert.ok(stored >= before + DAY_MS && stored <= Date.now() + DAY_MS);
});

test("a push without STATE is accepted and dropped", async () => {
  const response = await worker.fetch(push('{"next_run": "2026-10-23T10:30:00+00:00"}'), env);

  assert.equal(response.status, 204);
});

test("a push with a missing or wrong bearer answers 401", async () => {
  const STATE = memoryKv();
  const body = '{"next_run": "2026-10-23T10:30:00+00:00"}';

  for (const auth of [null, "Bearer wrong", "s3cret"]) {
    const response = await worker.fetch(push(body, { auth }), { ...env, STATE });
    assert.equal(response.status, 401, `${auth}`);
  }
  const unset = await worker.fetch(push(body, { auth: "Bearer undefined" }), { STATE });
  assert.equal(unset.status, 401, "a Worker without its secret refuses every push");
  assert.equal(STATE.store.size, 0);
});

test("a push without a parseable next run answers 400", async () => {
  const STATE = memoryKv();

  for (const body of ["not json", "null", "{}", '{"next_run": 1761215400}', '{"next_run": "soon"}']) {
    const response = await worker.fetch(push(body), { ...env, STATE });
    assert.equal(response.status, 400, body);
  }
  assert.equal(STATE.store.size, 0);
});

test("any other path or method answers 404", async () => {
  const STATE = memoryKv();
  const body = '{"next_run": "2026-10-23T10:30:00+00:00"}';

  assert.equal((await worker.fetch(push(body, { path: "/" }), { ...env, STATE })).status, 404);
  assert.equal((await worker.fetch(push(null, { method: "GET" }), { ...env, STATE })).status, 404);
  assert.equal(STATE.store.size, 0);
});
