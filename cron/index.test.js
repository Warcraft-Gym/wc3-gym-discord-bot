import assert from "node:assert/strict";
import test from "node:test";

import worker from "./index.js";

const env = { BACKEND_API_URL: "https://backend.example", CRON_SECRET: "s3cret" };

function stubFetch(status, body) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: status < 400, status, text: async () => body };
  };
  return calls;
}

test("calls the job with the bearer", async () => {
  const calls = stubFetch(200, '{"posted": 1}');

  await worker.scheduled(null, env);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://backend.example/jobs/cast-reminders");
  assert.equal(calls[0].options.headers.Authorization, "Bearer s3cret");
});

test("a refused call throws, so Cron Events shows it", async () => {
  stubFetch(401, '{"error": "Unauthorized"}');

  await assert.rejects(
    worker.scheduled(null, env),
    /cast-reminders answered 401: {"error": "Unauthorized"}/,
  );
});

function memoryKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => void store.set(key, value),
  };
}

const at = (iso) => ({ scheduledTime: Date.parse(iso) });

test("keeps the next run the backend answers", async () => {
  stubFetch(200, '{"posted": 0, "cup_reminders": 0, "next_run": "2026-10-23T10:30:00+00:00"}');
  const STATE = memoryKv();

  await worker.scheduled(at("2026-10-23T10:00:00Z"), { ...env, STATE });

  assert.equal(STATE.store.get("next_run"), "2026-10-23T10:30:00+00:00");
});

test("skips a tick before the next run, and calls at it", async () => {
  const calls = stubFetch(200, '{"posted": 0}');
  const STATE = memoryKv({ next_run: "2026-10-23T10:30:00+00:00" });

  await worker.scheduled(at("2026-10-23T10:25:00Z"), { ...env, STATE });
  assert.equal(calls.length, 0);

  await worker.scheduled(at("2026-10-23T10:30:00Z"), { ...env, STATE });
  assert.equal(calls.length, 1);
});

test("a next run too far ahead is not trusted", async () => {
  const calls = stubFetch(200, '{"posted": 0}');
  const STATE = memoryKv({ next_run: "2026-10-24T10:00:00+00:00" });

  await worker.scheduled(at("2026-10-23T10:00:00Z"), { ...env, STATE });

  assert.equal(calls.length, 1);
});

test("an answer without a next run keeps the last one", async () => {
  stubFetch(200, '{"posted": 1, "cup_reminders": 0}');
  const STATE = memoryKv({ next_run: "2026-10-23T09:00:00+00:00" });

  await worker.scheduled(at("2026-10-23T10:00:00Z"), { ...env, STATE });

  assert.equal(STATE.store.get("next_run"), "2026-10-23T09:00:00+00:00");
});
