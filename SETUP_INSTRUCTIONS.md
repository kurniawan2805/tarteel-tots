# Family Join Fix - Setup Instructions

## Issue
The "Join Family" button wasn't visible on Step 2 of signup. Root cause: RLS (Row-Level Security) policies on the `profiles` table were missing, blocking profile creation during signup.

## Solution
Apply the RLS policies migrations manually via Supabase dashboard:

### Step 1: Apply Essential Profile Policies (Required for Signup)

1. **Open your Supabase project**
   - Go to https://app.supabase.com/
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New Query"

3. **Copy & Run Migration 008**
   - Open file: `src/supabase/migrations/008_profile_rls_policies.sql`
   - Copy all the SQL
   - Paste into Supabase SQL Editor
   - Click "Run" button
   - ✅ This enables signup to work

### Step 2: Test Signup (Optional - test now if you want)
- Refresh your app
- Go to /signup
- Create account
- You should now see **"Setup Your Space"** with both buttons:
  - ✨ Create New Family
  - 🤝 Join Family

### Step 3: Add Family Viewing Policy (Optional - improves UX after families created)

If you want to enable parents to see each other's profile names:

1. Open SQL Editor again
2. New Query
3. Open file: `src/supabase/migrations/008b_profile_rls_family_policy.sql`
4. Copy & Run
5. ✅ Now family members can view each other's profiles

## What the Migrations Do

**Migration 008** (Required):
- Allow users to insert their own profile during signup (**CRITICAL**)
- Allow users to view their own profile
- Allow users to update their own profile

**Migration 008b** (Optional):
- Allow users to view other family members' profiles (requires migration 003 `memberships` table)

## Verification

After applying migration 008, you should see:
- ✅ Signup progresses from Step 1 → Step 2
- ✅ Join Family button is visible
- ✅ Create New Family button is visible
- ✅ Family join flow works end-to-end

## Troubleshooting

**Error: relation "memberships" does not exist**
- This is expected if migration 003 hasn't been applied yet
- Just run migration 008 (ignore the commented-out section)
- Run migration 008b later after migration 003 is applied

**Signup still not working**
- Ensure migration 008 completed without errors
- Refresh your browser cache (hard refresh or incognito)
- Check Supabase dashboard → Logs for any errors

## Future

In production, migrations should be applied automatically via Supabase migration system or CLI. For local dev, manual application via dashboard is required.


