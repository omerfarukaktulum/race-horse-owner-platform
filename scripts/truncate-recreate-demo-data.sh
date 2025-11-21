#!/bin/bash

# Script to truncate tables and recreate demo data
# Runs the TypeScript generator and then loads the generated SQL into the database

set -e  # Exit on error

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Step 1: Run TypeScript script to generate SQL
npx tsx scripts/generate-expenses-notes.ts

# Step 2: Load the generated SQL file into the database
psql -d tjk_stablemate -f demo-expenses-notes.sql

