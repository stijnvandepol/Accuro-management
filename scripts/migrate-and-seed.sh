#!/bin/sh
set -e

echo "[migrate] Running database migrations..."
npx prisma migrate deploy

echo "[migrate] Checking if seed is needed..."
NEEDS_SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c === 0 ? 'yes' : 'no'); p.\$disconnect(); }).catch(() => { console.log('yes'); p.\$disconnect(); });
")

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "[migrate] No users found — running seed..."
  npx tsx prisma/seed.ts
else
  echo "[migrate] Database already seeded — skipping."
fi

echo "[migrate] Done."
