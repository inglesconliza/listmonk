# Runbook

## Install

```bash
npm install
```

## Validate

```bash
npm run deploy:dry-run
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

## Verify

```bash
curl -fsS https://listmonk.inglesconliza.com/health
curl -fsSI https://listmonk.inglesconliza.com/
```

`/health` should report `status: "ok"` after database secrets are configured. Before that, it reports `status: "setup_required"` and lists missing secret names.
