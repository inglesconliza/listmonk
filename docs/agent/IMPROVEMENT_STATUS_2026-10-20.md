# LISTMONK improvement status, 2026-10-20

## LISTMONK-01

Status: complete on the nondeploying branch
`improvement/listmonk-01-readiness`.

Implementation commit: `3c3ea8ec5200b3f1008225f18c71d15de3919f41`
(`test: cover listmonk readiness contract`).

## Delivered scope

- Extracted the Worker readiness and adapter boundary into a testable module.
- Added offline fixtures that mock container lookup, state, startup, and fetch.
- Preserved `setup_required` for missing PostgreSQL configuration. Non-health
  traffic returns 503 before container lookup or startup.
- Kept `/health` deployment metadata and container state reporting intact.
- Made configured adapter startup or fetch failures return a controlled 503 with
  `adapter_unavailable`, without exposing the provider error.

## Checks

- `npm run test:readiness`: passed, 4 of 4 offline tests.
- `npx wrangler types`: passed and parsed the Worker configuration. Its generated
  `worker-configuration.d.ts` output was discarded because it is not part of this
  bounded package.
- `git diff --check`: passed before the implementation commit.
- The repository `npm run types` script could not run in this checkout because
  the local Wrangler executable is absent. No dependency installation, deploy,
  dry run, database access, container start, or provider call was performed.

## Source and live evidence

- Source baseline revalidated: `5317bcd459df4b455ab024790a685136a175d94a`
  on `master` had the missing-configuration 503 guard, but adapter errors were
  unhandled and had no offline contract coverage.
- Live public evidence, fetched 2026-10-20: `/health` returned HTTP 200 with
  `status: "setup_required"`, all four required database secrets listed as
  missing, and container state `stopped`.
- Live deployment metadata was `branch: "master"`,
  `commitHash: "8d43259cacb1507f5045c94e4c46447caca53c8a"`, and
  `deployedAt: "2026-08-17T20:20:44.383Z"`. It does not include this package.

## Blockers and next package

Listmonk activation remains deferred, not failed and not complete. There is no
durable PostgreSQL configuration and no approved storage-port decision. No release
is authorized while those gates remain unresolved. The next package is
LISTMONK-02, an explicit owner decision between durable PostgreSQL and a scoped
storage-port path, including cost, operations, migration, and rollback.
