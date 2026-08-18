# D1 and KV Deployment Plan

Last updated: 2026-08-18

## Goal

Deploy the InglesConLiza listmonk service at `https://listmonk.inglesconliza.com/` using Cloudflare Wrangler, Cloudflare Containers, D1 for relational data, KV for lightweight key/value state, and Cloudflare-native storage where appropriate.

## Current Baseline

- The repo already deploys a Cloudflare Worker named `listmonk-inglesconliza`.
- The Worker routes `listmonk.inglesconliza.com/*` to a singleton Cloudflare Container that runs listmonk on port `9000`.
- `/health` is implemented in the Worker and reports deployment metadata.
- The current runtime still expects PostgreSQL secrets before proxying traffic to the container.
- No Redis dependency was found in the current codebase. Sessions use `simplesessions/stores/postgres`, cache paths are mostly in-process or database-backed, and media can use filesystem or S3-compatible storage.

## Key Constraint

D1 is not a drop-in PostgreSQL replacement for listmonk.

The current app uses PostgreSQL-specific behavior throughout:

- `github.com/lib/pq` and `sqlx.Connect("postgres", ...)`
- Postgres enum types, `SERIAL` and `BIGSERIAL`, `uuid`, `JSONB`, array columns, partial indexes, and `CREATE EXTENSION pgcrypto`
- Postgres query features such as `ILIKE`, `TO_TSVECTOR`, `TO_TSQUERY`, `ANY($n)`, `pq.Array`, `NOW()`, `RETURNING`, and Postgres catalog functions
- Postgres-backed sessions from `github.com/zerodha/simplesessions/stores/postgres/v3`
- Migration code that creates and inspects Postgres types and constraints

Because of that, the work is a forked storage-port project, not a Wrangler binding-only deployment.

## Target Architecture

- Cloudflare Worker owns the hostname, `/health`, deployment metadata, and Cloudflare bindings.
- Cloudflare Container continues to run the Go listmonk HTTP server unless a later phase proves a Worker-native rewrite is better.
- D1 stores listmonk relational data after schema and query conversion from Postgres SQL to SQLite-compatible SQL.
- KV stores only lightweight state that does not require relational joins or strong transactional semantics, such as sessions, rate-limit markers, import job cursors, setup flags, and optional derived cache entries.
- R2, not KV or container disk, should store media uploads and generated thumbnails. Existing S3 provider may be adapted to R2's S3-compatible API first, then replaced with a native R2 path only if needed.
- Container disk remains ephemeral and must not be used for production persistence.

## Implementation Phases

### Phase 0: Acceptance Contract

Define the exact production acceptance surface before code changes:

- `https://listmonk.inglesconliza.com/health` returns `status: "ok"`, `branch`, full `commitHash`, `deployedAt`, and storage metadata showing D1/KV/R2 binding readiness.
- First-load UI renders through the production hostname.
- Admin login works after bootstrap.
- Subscriber list create/read/update/delete works.
- Subscriber import works for a small CSV.
- Campaign draft create/edit/archive works.
- Link click and campaign view tracking write to D1.
- Media upload uses R2 or a proven S3-compatible R2 configuration.
- A cache-busted live health check confirms the served commit after deploy.

### Phase 1: Cloudflare Resource Provisioning

Add Wrangler-managed resources without wiring the app to them yet:

- D1 database: `listmonk-inglesconliza`
- KV namespace: `LISTMONK_KV`
- R2 bucket: `listmonk-inglesconliza-media`
- Worker bindings in `wrangler.jsonc`
- Generated Worker types after config changes

Planned commands:

```bash
npx wrangler d1 create listmonk-inglesconliza
npx wrangler kv namespace create LISTMONK_KV
npx wrangler r2 bucket create listmonk-inglesconliza-media
npm run types
npm run deploy:dry-run
```

### Phase 2: D1 Feasibility Spike

Build the smallest executable D1-backed slice before porting the full app:

- Add a SQLite/D1 schema draft for users, roles, settings, sessions, lists, and subscribers.
- Convert only the minimum queries needed for setup, login, list creation, and subscriber creation.
- Add a build-tagged D1 storage path so the Postgres runtime can remain intact during the port.
- Validate the slice locally with SQLite-compatible tests and remotely with `wrangler d1 execute --remote`.

Exit criteria:

- The D1 schema applies cleanly.
- A minimal admin bootstrap can create/read a user.
- A minimal list and subscriber flow passes against D1.
- The Postgres path still builds.

### Phase 3: Query and Model Port

Port database usage by bounded feature groups:

- Auth, users, roles, sessions
- Settings and transactional templates
- Lists and subscribers
- Subscriber imports and bulk operations
- Campaigns, campaign lists, campaign media
- Link clicks, views, bounces, campaign analytics
- Maintenance and cleanup paths

Expected code changes:

- Replace `pq.Array` model fields with JSON-backed or join-table-backed types.
- Replace Postgres arrays with normalized join tables where queryable, or JSON text where display-only.
- Replace `JSONB` with SQLite JSON stored as `TEXT` plus JSON validation where necessary.
- Replace enum types with `TEXT CHECK (...)` constraints.
- Replace Postgres full-text search with SQLite FTS5 if supported in the execution target, or a simpler indexed `LIKE` search for the first production cut.
- Replace Postgres-specific error handling with driver-neutral constraint handling.
- Replace Postgres session store with a KV-backed session store or a D1 sessions table.

### Phase 4: Container-to-Binding Bridge

Confirm and implement the runtime bridge between the Go container and Worker bindings:

- Prefer Cloudflare Containers outbound handlers for D1, KV, and R2 binding access from the container.
- Expose a small internal HTTP API from the Worker for binding operations if direct driver-style access is not practical from Go.
- Keep the public app API unchanged.
- Add request authentication between container and Worker binding handlers.

Open decision:

- Whether the Go app should call a local HTTP binding bridge, or whether database access should be abstracted behind a Go driver-compatible interface. The spike should decide this based on simplicity, performance, and testability.

### Phase 5: R2 Media

Use the least invasive media approach:

- First configure the existing S3 provider against R2's S3-compatible endpoint.
- Store public URL, bucket, region, access key, and secret through secrets/settings.
- Verify upload, thumbnail, retrieval, and delete.
- Only build a native R2 provider if the S3-compatible path fails or exposes unacceptable operational gaps.

### Phase 6: Health, Observability, and Rollback

Extend `/health` to report:

- `branch`
- `commitHash`
- `deployedAt`
- D1 binding presence
- KV binding presence
- R2 binding presence
- Container state
- Storage mode, such as `d1-kv-r2`

Add deploy verification:

```bash
npm run deploy:dry-run
npm run deploy
curl -fsS "https://listmonk.inglesconliza.com/health?ts=$(date +%s)"
curl -fsSI "https://listmonk.inglesconliza.com/?ts=$(date +%s)"
```

Rollback path:

- Keep the current Postgres-backed container deploy path until the D1/KV/R2 build passes the production acceptance contract.
- If D1 porting blocks on SQL compatibility or container binding access, deploy with external Postgres while keeping R2 media and Worker health improvements.

## Risks

- D1 is SQLite-compatible, not Postgres-compatible. The current schema and queries require substantial conversion.
- D1 write throughput and transaction behavior must be validated for imports, campaign sending, analytics, and link tracking.
- KV is eventually consistent and should not replace relational state or counters that require transactional correctness.
- Cloudflare Container binding access requires a deliberate bridge. The Go process cannot be treated like Worker JavaScript with direct `env.DB.prepare(...)` calls.
- Running a newsletter sender from a sleeping singleton container may affect scheduled campaigns. The final design must verify wake behavior, background jobs, and long campaign sends.

## Recommended Next Step

Start with Phase 2 as a short branch:

1. Add D1/KV/R2 bindings and migrations.
2. Implement a minimal D1-backed auth/list/subscriber slice.
3. Prove it against remote D1.
4. Decide whether to continue the full port or keep Postgres for core relational data.

This avoids spending days converting all queries before proving that the container-to-D1 access pattern and D1 performance are acceptable for listmonk.
