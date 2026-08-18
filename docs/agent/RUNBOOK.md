# Runbook

## Install

```bash
npm install
```

## Validate

```bash
npm run deploy:dry-run
```

For the D1/KV/R2 port planning track, also audit Postgres-specific usage before implementation:

```bash
rg -n "postgres|PostgreSQL|pq|pgx|database/sql|sqlx|JSONB|TO_TSVECTOR|TO_TSQUERY|ILIKE|ANY\\(|RETURNING|pg_" go.mod cmd internal models queries schema.sql
```

## Configure Secrets

Set these after provisioning a durable PostgreSQL database:

```bash
npx wrangler secret put LISTMONK_DB_HOST
npx wrangler secret put LISTMONK_DB_USER
npx wrangler secret put LISTMONK_DB_PASSWORD
npx wrangler secret put LISTMONK_DB_DATABASE
```

Optional first-run admin bootstrap:

```bash
npx wrangler secret put LISTMONK_ADMIN_USER
npx wrangler secret put LISTMONK_ADMIN_PASSWORD
```

## Deploy

```bash
npm run deploy
```

The deploy script injects:
- `DEPLOY_BRANCH`
- `DEPLOY_COMMIT_HASH`
- `DEPLOYED_AT`

## D1/KV/R2 Port

The D1/KV/R2 deployment is not ready for `npm run deploy` until the plan in `docs/agent/D1_KV_DEPLOYMENT_PLAN.md` has passed its feasibility spike. Do not remove the current Postgres-backed path until the D1-backed auth, list, subscriber, campaign, tracking, and media flows pass against remote Cloudflare resources.

## Verify

```bash
curl -fsS https://listmonk.inglesconliza.com/health
curl -fsSI https://listmonk.inglesconliza.com/
```

`/health` should report `status: "ok"` after database secrets are configured. Before that, it reports `status: "setup_required"` and lists missing secret names.
