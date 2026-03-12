#!/bin/sh
set -e

if [ "$RUN_MIGRATE" = "1" ]; then
  echo "==> Waiting for database to be reachable..."
  tries=0
  max_tries=30
  until npx prisma migrate status 2>/dev/null; do
    tries=$((tries + 1))
    if [ "$tries" -ge "$max_tries" ]; then
      echo "ERROR: Database unreachable after ${max_tries} attempts. Check DATABASE_URL and that the database is running."
      exit 1
    fi
    echo "    Attempt $tries/$max_tries, retrying in 2s..."
    sleep 2
  done

  echo "==> Applying migrations..."
  if ! npx prisma migrate deploy; then
    echo "ERROR: prisma migrate deploy failed. Fix migration issues (e.g. run 'prisma migrate status' or 'prisma migrate resolve') and try again."
    exit 1
  fi
  echo "==> Migrations applied successfully."
fi

exec "$@"
