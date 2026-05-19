# Family Join Fix - Setup Instructions

## Issue
The "Join Family" button wasn't visible on Step 2 of signup. Root cause: RLS (Row-Level Security) policies on the `profiles` table were missing, blocking profile creation during signup.

## Solution
Apply the RLS policies migration manually via Supabase dashboard:

### Steps:

1. **Open your Supabase project**
   - Go to https://app.supabase.com/
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New Query"

3. **Copy & Run Migration**
   - Open file: `src/supabase/migrations/008_profile_rls_policies.sql`
   - Copy all the SQL
   - Paste into Supabase SQL Editor
   - Click "Run" button

4. **Test Signup**
   - Refresh your app
   - Go to /signup
   - Create account
   - You should now see **"Setup Your Space"** with both buttons:
     - ✨ Create New Family
     - 🤝 Join Family

## What the Migration Does

Adds RLS policies to the `profiles` table that allow:
- Users to insert their own profile during signup
- Users to view their own profile
- Users to update their own profile  
- Users to view other family members' profiles

## Verification

After applying migration, you should see:
- ✅ Signup progresses from Step 1 → Step 2
- ✅ Join Family button is visible
- ✅ Create New Family button is visible
- ✅ Family join flow works end-to-end

## Future

In production, migrations should be applied automatically via Supabase migration system or CLI. For local dev, manual application via dashboard is required.
