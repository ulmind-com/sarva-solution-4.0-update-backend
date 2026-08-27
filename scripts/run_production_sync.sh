#!/bin/bash

# Production Database Sync Runner
# This script runs the sync with proper output

echo "═══════════════════════════════════════════════════"
echo "  PRODUCTION DATABASE SYNC"
echo "═══════════════════════════════════════════════════"
echo ""
echo "⚠️  This will update your PRODUCTION database"
echo "   Make sure your .env file has the correct MONGODB_URI"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "🚀 Starting sync..."
echo ""

node scripts/sync_production.js

echo ""
echo "✅ Script execution completed"
echo ""
