#!/bin/sh
set -e
if [ "$RUN_MIGRATE" = "1" ]; then
  node /app/node_modules/prisma/build/index.js migrate deploy
fi
exec "$@"
