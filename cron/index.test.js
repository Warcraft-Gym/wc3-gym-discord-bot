import assert from "node:assert/strict";
import test from "node:test";

import worker from "./index.js";

const env = { BACKEND_API_URL: "https://backend.example", CRON_SECRET: "s3cret" };
const jobTick = { scheduledTime: Date.parse("2026-10-23T10:05:00Z") };
const probeTick = { scheduledTime: Date.parse("2026-10-23T10:07:00Z") };

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

  await worker.scheduled(jobTick, env);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://backend.example/jobs/cast-reminders");
  assert.equal(calls[0].options.headers.Authorization, "Bearer s3cret");
});

test("a refused call throws, so Cron Events shows it", async () => {
  stubFetch(401, '{"error": "Unauthorized"}');

  await assert.rejects(
    worker.scheduled(jobTick, env),
    /cast-reminders answered 401: {"error": "Unauthorized"}/,
  );
});

test("any other minute probes /health without the bearer", async () => {
  const calls = stubFetch(200, '{"ok": true}');

  await worker.scheduled(probeTick, env);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://backend.example/health");
  assert.equal(calls[0].options?.headers?.Authorization, undefined);
});

test("a failed probe throws, so Cron Events shows it", async () => {
  stubFetch(500, "Internal Server Error");

  await assert.rejects(worker.scheduled(probeTick, env), /health answered 500/);
});
