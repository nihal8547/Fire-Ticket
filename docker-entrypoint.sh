#!/bin/sh
set -e

echo "=================================================="
echo " FireTicket Production System Starting"
echo "=================================================="

# Check and sync database schema
if [ -n "$DATABASE_URL" ]; then
  echo "==> Verifying database schema with Prisma..."
  if [ -f "./node_modules/prisma/build/index.js" ]; then
    node ./node_modules/prisma/build/index.js db push --skip-generate || echo "==> Prisma notice: db push completed with code $?"
  elif command -v npx > /dev/null 2>&1; then
    npx prisma db push --skip-generate || echo "==> Prisma notice: db push completed with code $?"
  fi
fi

echo "==> Starting FireTicket Application on port ${PORT:-3000}..."
exec "$@"
