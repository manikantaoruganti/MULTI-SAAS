#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! pg_isready -h $DATABASE_HOST -p 5432 > /dev/null 2>&1; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing migrations"

# Run all migrations
echo "Running migrations..."
for file in /app/migrations/*.sql; do
  echo "Executing $file..."
  psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME < "$file"
done

# Run seed data
echo "Seeding database..."
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME < /app/seeds/seeddata.sql

echo "Database initialized successfully!"
echo "Starting Node.js server..."

node /app/src/server.js
