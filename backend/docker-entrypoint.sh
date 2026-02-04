#!/bin/sh
###############################################################################
# REdI Quiz Platform - Docker Entrypoint
# Runs database migrations before starting the application.
# Optionally seeds the database when RUN_SEED=true.
###############################################################################

set -e

echo "=== REdI Quiz Platform - Container Startup ==="
echo ""

# ─── Run database migrations ────────────────────────────────────────────────
echo "Running database migrations..."
npx prisma migrate deploy
echo "Migrations complete."
echo ""

# ─── Optional: seed database ────────────────────────────────────────────────
if [ "$RUN_SEED" = "true" ]; then
  echo "RUN_SEED=true — running database seed..."
  node prisma/seed.js
  echo "Seed complete."
  echo ""
fi

# ─── Start the application ──────────────────────────────────────────────────
echo "Starting application..."
exec node dist/index.js
