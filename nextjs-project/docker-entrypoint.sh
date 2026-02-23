#!/bin/sh
set -e
if [ "$RUN_MIGRATE" = "1" ]; then
  npx prisma migrate deploy
fi
exec "$@"
