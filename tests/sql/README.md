# Real PostgreSQL tests for migration 0009 — NOT mocks.

These run against a LOCAL, throwaway PostgreSQL database. They never touch
production: the runner creates a scratch database, loads a minimal stub schema
(only the columns the functions under test use), applies the ORIGINAL 0002
function definitions, then the corrected 0009, seeds 260 published posts +
260 published books, and verifies behavior.

## Requirements

- A local PostgreSQL server (e.g. `apt-get install postgresql` on Debian/Ubuntu,
  or `docker run -e POSTGRES_PASSWORD=x -p 5432:5432 postgres:15`).

## Run

```sh
# default: uses the local `postgres` superuser via sudo
sh tests/sql/run.sh

# or against a custom server:
PGHOST=localhost PGUSER=postgres PGPASSWORD=x sh tests/sql/run.sh
```

## What is verified

1. Exactly ONE overload per function after 0009 (the old draft's ambiguity bug).
2. Legacy 3-argument calls still work (no PGRST203 / "not unique").
3. 260 records paginate as 200+60 across two batches — disjoint and complete.
4. The 200-per-request cap is enforced even when 500 is requested.
5. Drafts (published=false) never appear in any batch.
6. Tenant isolation: another tenant's rows are never returned.
7. Pagination terminates cleanly past the end.
8. anon and authenticated hold EXECUTE on the new signatures.

All eight checks must print `t` (true). Any `f` is a failure.
