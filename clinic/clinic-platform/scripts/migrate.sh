#!/bin/bash
# EF Core Migrations helper
# Runs inside the backend container so .NET 8 is available.
#
# Usage:
#   ./scripts/migrate.sh add InitialCreate      # create initial migration
#   ./scripts/migrate.sh add AddSomeFeature     # add a new migration
#   ./scripts/migrate.sh apply                  # apply pending migrations to DB
#   ./scripts/migrate.sh list                   # list migrations
#
# Prerequisites:
#   docker-compose up -d backend db
#
set -e

CONTAINER="clinic-backend"
ACTION="${1:-apply}"
MIGRATION_NAME="${2:-}"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: Container '${CONTAINER}' is not running."
  echo "Run: docker-compose up -d"
  exit 1
fi

case "$ACTION" in
  add)
    if [ -z "$MIGRATION_NAME" ]; then
      echo "Usage: $0 add <MigrationName>"
      exit 1
    fi
    echo "Creating migration: $MIGRATION_NAME"
    docker exec -w /app "$CONTAINER" \
      dotnet ef migrations add "$MIGRATION_NAME" \
        --project ClinicPlatform.Api.csproj \
        --output-dir Data/Migrations
    echo "Migration created. Commit the generated files in Data/Migrations/."
    ;;

  apply)
    echo "Applying pending migrations..."
    docker exec -w /app "$CONTAINER" \
      dotnet ef database update \
        --project ClinicPlatform.Api.csproj
    echo "Migrations applied."
    ;;

  list)
    docker exec -w /app "$CONTAINER" \
      dotnet ef migrations list \
        --project ClinicPlatform.Api.csproj
    ;;

  *)
    echo "Unknown action: $ACTION"
    echo "Usage: $0 {add|apply|list} [MigrationName]"
    exit 1
    ;;
esac
