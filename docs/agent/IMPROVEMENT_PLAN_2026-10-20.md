# Listmonk improvement plan, 2026-10-20

Owner: topic 30346. Requester: @guerrerocarlos. Coordinator: InglesConLiza manager topic 0.
Source: [fleet review](https://github.com/inglesconliza/inglesconliza-manager/blob/main/docs/reviews/2026-10-16/REVIEW.md).

## Scope and baseline

Branch `master`. Listmonk remains a deferred component. The review observed
`setup_required`, and the current container adapter depends on durable PostgreSQL.
The existing D1/KV plan is a proposal, not an implemented storage backend.
This improvement program does not authorize provisioning a database, importing
subscribers, sending campaigns, or silently activating Listmonk.

## Ordered work packages

| ID | Priority | Task and acceptance | Gate |
|---|---|---|---|
| LISTMONK-01 | P2 | Verify adapter/readiness metadata contract with offline fixtures. Missing config returns setup-required; ordinary traffic returns controlled 503. Record current public health and committed/live source distinction. | Can run now without activation. |
| LISTMONK-02 | P2 | Write explicit activation decision with durable PostgreSQL versus scoped storage-port costs, operations, migration and rollback. | Owner chooses activation and storage strategy. |
| LISTMONK-03 | P2 | Implement chosen persistence, staging restore, sender/suppression/unsubscribe acceptance and dependency patch gates. | LISTMONK-02; approved provider configuration and test identities. |
| LISTMONK-04 | P3 | Evaluate scheduling, reporting and marketing integration only for a concrete campaign need. | Product adoption and LISTMONK-03 acceptance. |

## First topic task

Execute LISTMONK-01 only. Re-read AGENTS, current Worker/container adapter and
deployment configuration. Add a focused offline test harness for setup/readiness,
metadata, and configured-adapter error handling if useful. Do not turn a readiness
check into production startup, database initialization, or campaign delivery.
If the adapter is already correct, report verified evidence without making artificial
code changes.

## Verification and rollback

Read package scripts and local tooling first. `deploy` and `deploy:dry-run` are not
the required test command. Fixtures must mock container state, start, and fetch and
must never reach a real database or mail provider. Run appropriate type/tests,
`git diff --check`, and inspect only owned changes before commit/push. Docs/tests-only
commits should skip deployment CI. If a code fix is needed, report the controlled
release target and keep setup-required until configuration is explicitly authorized.
Future migrations require a restorable PostgreSQL backup or a separately approved
storage-port migration, not ephemeral container disk.

## Reporting

Write `docs/agent/IMPROVEMENT_STATUS_2026-10-20.md` with LISTMONK-01 outcome, checks,
commit and next gate. Mark the activation backlog deferred, not failed and not done.
Do not edit the manager worklog. Complete to @guerrerocarlos.
