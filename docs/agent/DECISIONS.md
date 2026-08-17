# Decisions

## 2026-08-17: Use Cloudflare Containers for listmonk

Decision: Deploy listmonk through a Cloudflare Worker backed by a Cloudflare Container, rather than attempting to port listmonk into a plain Worker.

Rationale: listmonk is a long-running Go application that requires PostgreSQL, SMTP connectivity, migrations, and background workers. A plain Worker cannot run the existing Go server binary directly. Cloudflare Containers can run the existing containerized app while still letting Cloudflare Workers own the hostname route and `/health` metadata.

Consequence: Production still requires a durable external PostgreSQL database. Cloudflare container disk is ephemeral and must not be used for production database persistence.
