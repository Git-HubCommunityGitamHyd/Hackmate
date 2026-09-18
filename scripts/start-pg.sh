#!/bin/bash
# Starts the local embedded PostgreSQL (mirrors CockroachDB's wire protocol for dev).
# Used ONLY for the sandbox/dev preview. In production, DATABASE_URL points to
# CockroachDB Serverless (see README).
export LD_LIBRARY_PATH=/home/z/my-project/scripts/pglib:$LD_LIBRARY_PATH
PGBIN=/home/z/my-project/scripts/pgbin/node_modules/@embedded-postgres/linux-x64/native/bin
PGDATA=/home/z/my-project/.pgdata

if $PGBIN/pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  echo "postgres already running"
  exit 0
fi
$PGBIN/pg_ctl -D "$PGDATA" -o "-p 5432 -c listen_addresses=localhost" -l /home/z/my-project/scripts/pg.log start
sleep 1
$PGBIN/psql -h localhost -p 5432 -U postgres -c "SELECT 1 FROM pg_database WHERE datname='hackmate'" | grep -q 1 || \
  $PGBIN/createdb -h localhost -p 5432 -U postgres hackmate
echo "postgres ready on localhost:5432, database: hackmate"
