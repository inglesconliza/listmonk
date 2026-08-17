# State

Last updated: 2026-08-17

This repository is the InglesConLiza fork of `knadh/listmonk`.

Runtime target:
- Public URL: `https://listmonk.inglesconliza.com/`
- Cloudflare Worker: `listmonk-inglesconliza`
- Runtime model: Cloudflare Worker routes requests to a singleton Cloudflare Container running listmonk on port `9000`.
- Telegram topic: `listmonk #30346`

Current status:
- Cloudflare container scaffolding is present.
- Deployment requires a durable PostgreSQL database and Worker secrets before listmonk can serve real traffic.
- The Worker `/health` route is available independently of the container and reports deployment metadata plus missing setup.

Required secrets:
- `LISTMONK_DB_HOST`
- `LISTMONK_DB_USER`
- `LISTMONK_DB_PASSWORD`
- `LISTMONK_DB_DATABASE`

Optional secrets:
- `LISTMONK_ADMIN_USER`
- `LISTMONK_ADMIN_PASSWORD`

Config vars:
- `LISTMONK_DB_PORT`, default `5432`
- `LISTMONK_DB_SSL_MODE`, default `require`
- `LISTMONK_PUBLIC_URL`, default `https://listmonk.inglesconliza.com`
