#!/bin/sh
set -e

# Validate required environment variables
missing=""
for var in DATABASE_URL JWT_SECRET_KEY; do
  eval val=\$$var
  if [ -z "$val" ]; then
    missing="$missing $var"
  fi
done

if [ -n "$missing" ]; then
  echo "ERROR: Missing required environment variables:$missing" >&2
  exit 1
fi

# Run database migrations
echo "Running Alembic migrations..."
alembic upgrade head

# Start the application
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
