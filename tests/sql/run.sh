#!/bin/sh
# Runs the REAL PostgreSQL pagination tests for migration 0009 on a scratch
# database. Never points at production: it creates and drops a temp database.
# Usage: sh tests/sql/run.sh   (honors PGHOST/PGUSER/PGPASSWORD; default: local postgres via sudo)
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
DB="apptest_$$"

if [ -n "$PGHOST" ] || [ -n "$PGUSER" ]; then
  PSQL="psql"
  $PSQL -c "drop database if exists $DB" >/dev/null
  $PSQL -c "create database $DB" >/dev/null
else
  PSQL="su postgres -c psql"
  su postgres -c "psql -c 'drop database if exists $DB'" >/dev/null
  su postgres -c "psql -c 'create database $DB'" >/dev/null
fi

run() { # run a file against the scratch db
  if [ -n "$PGHOST" ] || [ -n "$PGUSER" ]; then $PSQL -d "$DB" -f "$1"; else su postgres -c "psql -d $DB -f '$1'"; fi
}

echo "== stub schema + original 0002 signatures =="
run "$DIR/schema_stub.sql" >/dev/null
echo "== applying migration 0009 (the file under test) =="
run "$DIR/../../supabase/migrations/0009_public_list_pagination.sql" >/dev/null
echo "== checks (every row must be 't') =="
run "$DIR/pagination_0009.test.sql" | grep -E "\| [tf]" || true

if [ -n "$PGHOST" ] || [ -n "$PGUSER" ]; then $PSQL -c "drop database $DB" >/dev/null; else su postgres -c "psql -c 'drop database $DB'" >/dev/null; fi
echo "== scratch database dropped =="
