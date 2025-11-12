#!/bin/bash

# ============================================
# Truncate Database Script
# ============================================
# This script truncates all data from the local database
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}⚠️  WARNING: This will delete ALL data from your database!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${GREEN}✓ Aborted. No changes made.${NC}"
    exit 0
fi

echo ""
echo "Loading environment variables..."

# Load DATABASE_URL from .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep DATABASE_URL | xargs)
elif [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | grep DATABASE_URL | xargs)
else
    echo -e "${RED}✗ Error: .env file not found${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ Error: DATABASE_URL not found in .env file${NC}"
    exit 1
fi

# Remove the ?schema parameter that Prisma uses but psql doesn't support
# This handles both ?schema=xxx and ?schema=xxx&other=yyy formats
DATABASE_URL_CLEAN="${DATABASE_URL%%\?*}"

echo "Truncating database..."
echo ""

# Run the SQL script
psql "$DATABASE_URL_CLEAN" -f "$SCRIPT_DIR/truncate-database.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Database truncated successfully!${NC}"
    echo ""
    echo "All tables are now empty. You can:"
    echo "  - Run 'npm run db:seed' to add seed data"
    echo "  - Start fresh by creating new users through the app"
else
    echo ""
    echo -e "${RED}✗ Error: Failed to truncate database${NC}"
    exit 1
fi

