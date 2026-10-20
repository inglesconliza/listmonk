import assert from "node:assert/strict";
import test from "node:test";
import { handleListmonkRequest, type ListmonkContainerStub, type ListmonkEnv } from "../src/readiness.ts";

function fixture(overrides: Partial<ListmonkEnv> = {}) {
  const calls: {
    getByName: number;
    start: number;
    fetch: number;
    startOptions?: Parameters<ListmonkContainerStub["startAndWaitForPorts"]>[0];
  } = { getByName: 0, start: 0, fetch: 0 };
  const container: ListmonkContainerStub = {
    async getState() {
      return { status: "stopped" };
    },
    async startAndWaitForPorts(options) {
      calls.start += 1;
      calls.startOptions = options;
    },
    async fetch() {
      calls.fetch += 1;
      return new Response("adapter response", { status: 201 });
    }
  };
  const env: ListmonkEnv = {
    LISTMONK_CONTAINER: {
      getByName(name) {
        assert.equal(name, "primary");
        calls.getByName += 1;
        return container;
      }
    },
    DEPLOY_BRANCH: "improvement/listmonk-01-readiness",
    DEPLOY_COMMIT_HASH: "fixture-commit",
    DEPLOYED_AT: "2026-10-20T00:00:00.000Z",
    LISTMONK_PUBLIC_URL: "https://listmonk.inglesconliza.com",
    ...overrides
  };

  return { calls, container, env };
}

test("missing database configuration reports setup-required without starting the adapter", async () => {
  const { calls, env } = fixture();

  const response = await handleListmonkRequest(new Request("https://example.test/"), env);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    service: "listmonk-inglesconliza",
    status: "setup_required",
    message: "Configure the required PostgreSQL secrets before starting listmonk.",
    missingSecrets: ["LISTMONK_DB_HOST", "LISTMONK_DB_USER", "LISTMONK_DB_PASSWORD", "LISTMONK_DB_DATABASE"],
    branch: "improvement/listmonk-01-readiness",
    commitHash: "fixture-commit",
    deployedAt: "2026-10-20T00:00:00.000Z"
  });
  assert.equal(calls.getByName, 0);
  assert.equal(calls.start, 0);
  assert.equal(calls.fetch, 0);
});

test("health records deployment metadata and readiness state with missing configuration", async () => {
  const { calls, env } = fixture();

  const response = await handleListmonkRequest(new Request("https://example.test/health"), env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: "listmonk-inglesconliza",
    status: "setup_required",
    branch: "improvement/listmonk-01-readiness",
    commitHash: "fixture-commit",
    deployedAt: "2026-10-20T00:00:00.000Z",
    publicUrl: "https://listmonk.inglesconliza.com",
    containerState: { status: "stopped" },
    missingSecrets: ["LISTMONK_DB_HOST", "LISTMONK_DB_USER", "LISTMONK_DB_PASSWORD", "LISTMONK_DB_DATABASE"]
  });
  assert.equal(calls.getByName, 1);
  assert.equal(calls.start, 0);
});

test("configured adapter errors return a controlled 503 without leaking the error", async () => {
  const { calls, container, env } = fixture({
    LISTMONK_DB_HOST: "db.example.test",
    LISTMONK_DB_USER: "listmonk",
    LISTMONK_DB_PASSWORD: "not-a-secret",
    LISTMONK_DB_DATABASE: "listmonk"
  });
  container.startAndWaitForPorts = async () => {
    calls.start += 1;
    throw new Error("provider-specific failure");
  };

  const response = await handleListmonkRequest(new Request("https://example.test/"), env);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    service: "listmonk-inglesconliza",
    status: "adapter_unavailable",
    branch: "improvement/listmonk-01-readiness",
    commitHash: "fixture-commit",
    deployedAt: "2026-10-20T00:00:00.000Z"
  });
  assert.equal(calls.start, 1);
  assert.equal(calls.fetch, 0);
});

test("configured adapter receives the database environment and returns its response", async () => {
  const { calls, env } = fixture({
    LISTMONK_DB_HOST: "db.example.test",
    LISTMONK_DB_PORT: "6432",
    LISTMONK_DB_USER: "listmonk",
    LISTMONK_DB_PASSWORD: "fixture-password",
    LISTMONK_DB_DATABASE: "listmonk",
    LISTMONK_DB_SSL_MODE: "verify-full",
    LISTMONK_ADMIN_USER: "admin",
    LISTMONK_ADMIN_PASSWORD: "fixture-admin-password"
  });

  const response = await handleListmonkRequest(new Request("https://example.test/login"), env);

  assert.equal(response.status, 201);
  assert.equal(await response.text(), "adapter response");
  assert.equal(calls.start, 1);
  assert.equal(calls.fetch, 1);
  assert.deepEqual(calls.startOptions, {
    ports: [9000],
    startOptions: {
      envVars: {
        LISTMONK_app__address: "0.0.0.0:9000",
        LISTMONK_db__host: "db.example.test",
        LISTMONK_db__port: "6432",
        LISTMONK_db__user: "listmonk",
        LISTMONK_db__password: "fixture-password",
        LISTMONK_db__database: "listmonk",
        LISTMONK_db__ssl_mode: "verify-full",
        LISTMONK_db__max_open: "25",
        LISTMONK_db__max_idle: "25",
        LISTMONK_db__max_lifetime: "300s",
        TZ: "Etc/UTC",
        LISTMONK_ADMIN_USER: "admin",
        LISTMONK_ADMIN_PASSWORD: "fixture-admin-password"
      }
    }
  });
});
