# LISTMONK improvement status, 2026-10-20

## LISTMONK-01

Status: complete on the nondeploying branch
`improvement/listmonk-01-readiness`.

Implementation commit: `3c3ea8ec5200b3f1008225f18c71d15de3919f41`
(`test: cover listmonk readiness contract`).

### Checkpoint 38 correction

Status: complete on the same nondeploying branch, not deployed.

Correction commit: `e8d85f558ca3b52e115161e7675b17c7870d23d5`
(`fix: handle async listmonk adapter failures`).

The prior source returned the promise from `container.fetch()` without awaiting it
inside the `try` boundary. An asynchronous fetch rejection therefore escaped the
controlled 503 response. The correction awaits that promise within the boundary.
The regression suite separately verifies startup rejection, asynchronous fetch
rejection, successful fetch, missing-configuration no-start behavior, and health
metadata.

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
- Checkpoint 38: `npm run test:readiness` passed, 5 of 5 offline tests;
  `npx wrangler types` passed; and `git diff --check` passed before the
  correction commit. The generated type file was discarded.

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
- Checkpoint 38 source evidence: commit `3c3ea8ec5200b3f1008225f18c71d15de3919f41`
  contained the un-awaited fetch return; correction commit
  `e8d85f558ca3b52e115161e7675b17c7870d23d5` contains the awaited boundary.
  This was reproduced and verified only with offline stubs.
- Checkpoint 38 live evidence: no public endpoint was called and no deployment
  occurred. The preceding live evidence remains historical evidence of the
  deferred `8d43259...` deployment only, not evidence for either source commit.

## Blockers and next package

Listmonk activation remains deferred, not failed and not complete. There is no
durable PostgreSQL configuration and no approved storage-port decision. No release
is authorized while those gates remain unresolved. The next package is
LISTMONK-02, an explicit owner decision between durable PostgreSQL and a scoped
storage-port path, including cost, operations, migration, and rollback.
