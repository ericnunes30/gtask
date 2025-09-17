#!/bin/bash
set -e

echo "🔄 Running database migrations..."
node dist/console.js db:migrate

echo "✅ Migrations completed, starting application..."
exec node dist/main.js