import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";

const { buildServer } = await import("../src/server.js");

test("buildServer exposes health endpoint without requiring database", async () => {
  const app = buildServer();
  const address = await app.listen({ port: 0, host: "127.0.0.1" });

  try {
    const response = await fetch(`${address}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    await app.close();
  }
});
