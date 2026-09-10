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
