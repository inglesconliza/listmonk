# Decisions

## 2026-08-17: Use Cloudflare Containers for listmonk

Decision: Deploy listmonk through a Cloudflare Worker backed by a Cloudflare Container, rather than attempting to port listmonk into a plain Worker.

Rationale: listmonk is a long-running Go application that requires PostgreSQL, SMTP connectivity, migrations, and background workers. A plain Worker cannot run the existing Go server binary directly. Cloudflare Containers can run the existing containerized app while still letting Cloudflare Workers own the hostname route and `/health` metadata.

Consequence: Production still requires a durable external PostgreSQL database. Cloudflare container disk is ephemeral and must not be used for production database persistence.

## 2026-08-18: Treat D1/KV as a storage port, not a drop-in config swap

Decision: Plan the requested D1/KV/R2 deployment as a forked storage-port project with a feasibility spike before full implementation.

Rationale: The current listmonk codebase uses Postgres-specific drivers, sessions, migrations, schema types, arrays, JSONB, full-text search, and query syntax. D1 is SQLite-compatible and is accessed through Cloudflare bindings, so replacing Postgres with D1 requires schema, query, session, and container binding bridge work.

Consequence: Keep the existing Postgres-backed Cloudflare Container route as the rollback path until a D1-backed slice proves auth, lists, subscribers, campaigns, tracking, and media on remote Cloudflare resources.
