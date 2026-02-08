#!/bin/bash

# =====================================================
# Deploy Calendar Integration Edge Functions
# =====================================================
# This script deploys all Edge Functions to Supabase
# Run with: bash deploy-functions.sh
# =====================================================

set -e  # Exit on error

echo ""
echo "🚀 Deploying Calendar Integration Edge Functions..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo "  OR"
    echo "  brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase!"
    echo ""
    echo "Please login first:"
    echo "  supabase login"
    echo ""
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Project not linked!"
    echo ""
    echo "Please link your project first:"
    echo "  supabase link --project-ref bufnygjdkdemacqbxcrh"
    echo ""
    exit 1
fi

echo "✅ Project linked"
echo ""

# Deploy functions
echo "📦 Deploying Edge Functions..."
echo ""

echo "1️⃣  Deploying google-oauth-callback..."
supabase functions deploy google-oauth-callback --no-verify-jwt
echo "   ✅ google-oauth-callback deployed"
echo ""

echo "2️⃣  Deploying create-calendar-event..."
supabase functions deploy create-calendar-event --no-verify-jwt
echo "   ✅ create-calendar-event deployed"
echo ""

echo "3️⃣  Deploying disconnect-calendar..."
supabase functions deploy disconnect-calendar --no-verify-jwt
echo "   ✅ disconnect-calendar deployed"
echo ""

echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "📍 Your functions are now available at:"
echo "   • https://bufnygjdkdemacqbxcrh.supabase.co/functions/v1/google-oauth-callback"
echo "   • https://bufnygjdkdemacqbxcrh.supabase.co/functions/v1/create-calendar-event"
echo "   • https://bufnygjdkdemacqbxcrh.supabase.co/functions/v1/disconnect-calendar"
echo ""
echo "✨ Next steps:"
echo "   1. Test OAuth flow by connecting your calendar"
echo "   2. Try creating a calendar event from a resource"
echo ""
