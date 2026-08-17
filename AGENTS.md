# Agent Instructions

- Keep `docs/agent/` current when deployment, runtime, or product decisions change.
- Do not commit secrets, `.dev.vars`, database URLs, admin passwords, SMTP credentials, or raw subscriber exports.
- This fork deploys listmonk through a Cloudflare Worker backed by Cloudflare Containers at `https://listmonk.inglesconliza.com/`.
- listmonk requires a durable PostgreSQL database. Do not run Postgres on Cloudflare container ephemeral disk for production.
- `/health` must expose `branch`, `commitHash`, and `deployedAt`.
