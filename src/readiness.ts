export type ListmonkContainerStub = {
  getState(): Promise<unknown>;
  startAndWaitForPorts(options: {
    ports: number[];
    startOptions: { envVars: Record<string, string> };
  }): Promise<void>;
  fetch(request: Request): Promise<Response>;
};

export type ListmonkEnv = {
  LISTMONK_CONTAINER: {
    getByName(name: string): ListmonkContainerStub;
  };
  DEPLOY_BRANCH: string;
  DEPLOY_COMMIT_HASH: string;
  DEPLOYED_AT: string;
  LISTMONK_PUBLIC_URL: string;
  LISTMONK_DB_HOST?: string;
  LISTMONK_DB_PORT?: string;
  LISTMONK_DB_USER?: string;
  LISTMONK_DB_PASSWORD?: string;
  LISTMONK_DB_DATABASE?: string;
  LISTMONK_DB_SSL_MODE?: string;
  LISTMONK_ADMIN_USER?: string;
  LISTMONK_ADMIN_PASSWORD?: string;
};

const REQUIRED_SECRET_KEYS = [
  "LISTMONK_DB_HOST",
  "LISTMONK_DB_USER",
  "LISTMONK_DB_PASSWORD",
  "LISTMONK_DB_DATABASE"
] as const;

export async function handleListmonkRequest(request: Request, env: ListmonkEnv): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return healthResponse(env);
  }

  const missingSecrets = getMissingSecrets(env);
  if (missingSecrets.length > 0) {
    return setupRequiredResponse(env, missingSecrets);
  }

  try {
    const container = env.LISTMONK_CONTAINER.getByName("primary");

    await container.startAndWaitForPorts({
      ports: [9000],
      startOptions: {
        envVars: getContainerEnv(env)
      }
    });

    return await container.fetch(request);
  } catch {
    return json(
      {
        service: "listmonk-inglesconliza",
        status: "adapter_unavailable",
        branch: env.DEPLOY_BRANCH,
        commitHash: env.DEPLOY_COMMIT_HASH,
        deployedAt: env.DEPLOYED_AT
      },
      503
    );
  }
}

async function healthResponse(env: ListmonkEnv): Promise<Response> {
  let containerState: unknown = "unavailable";

  try {
    containerState = await env.LISTMONK_CONTAINER.getByName("primary").getState();
  } catch (error) {
    containerState = error instanceof Error ? error.message : "unknown_error";
  }

  const missingSecrets = getMissingSecrets(env);

  return json({
    service: "listmonk-inglesconliza",
    status: missingSecrets.length === 0 ? "ok" : "setup_required",
    branch: env.DEPLOY_BRANCH,
    commitHash: env.DEPLOY_COMMIT_HASH,
    deployedAt: env.DEPLOYED_AT,
    publicUrl: env.LISTMONK_PUBLIC_URL,
    containerState,
    missingSecrets
  });
}

function setupRequiredResponse(env: ListmonkEnv, missingSecrets: string[]): Response {
  return json(
    {
      service: "listmonk-inglesconliza",
      status: "setup_required",
      message: "Configure the required PostgreSQL secrets before starting listmonk.",
      missingSecrets,
      branch: env.DEPLOY_BRANCH,
      commitHash: env.DEPLOY_COMMIT_HASH,
      deployedAt: env.DEPLOYED_AT
    },
    503
  );
}

function getMissingSecrets(env: ListmonkEnv): string[] {
  return REQUIRED_SECRET_KEYS.filter((key) => !env[key]);
}

function getContainerEnv(env: ListmonkEnv): Record<string, string> {
  const vars: Record<string, string> = {
    LISTMONK_app__address: "0.0.0.0:9000",
    LISTMONK_db__host: requireValue(env.LISTMONK_DB_HOST, "LISTMONK_DB_HOST"),
    LISTMONK_db__port: env.LISTMONK_DB_PORT || "5432",
    LISTMONK_db__user: requireValue(env.LISTMONK_DB_USER, "LISTMONK_DB_USER"),
    LISTMONK_db__password: requireValue(env.LISTMONK_DB_PASSWORD, "LISTMONK_DB_PASSWORD"),
    LISTMONK_db__database: requireValue(env.LISTMONK_DB_DATABASE, "LISTMONK_DB_DATABASE"),
    LISTMONK_db__ssl_mode: env.LISTMONK_DB_SSL_MODE || "require",
    LISTMONK_db__max_open: "25",
    LISTMONK_db__max_idle: "25",
    LISTMONK_db__max_lifetime: "300s",
    TZ: "Etc/UTC"
  };

  if (env.LISTMONK_ADMIN_USER) {
    vars.LISTMONK_ADMIN_USER = env.LISTMONK_ADMIN_USER;
  }

  if (env.LISTMONK_ADMIN_PASSWORD) {
    vars.LISTMONK_ADMIN_PASSWORD = env.LISTMONK_ADMIN_PASSWORD;
  }

  return vars;
}

function requireValue(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
