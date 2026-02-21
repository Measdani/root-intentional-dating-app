# Supabase Users Table Setup

This guide explains how to create the `users` table in Supabase to support user registration and persistence.

## Setup Instructions

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://app.supabase.com
   - Navigate to SQL Editor

2. **Run the following SQL**

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  city TEXT,
  gender TEXT,
  partnership_intent TEXT,
  family_alignment JSONB,
  values TEXT[] DEFAULT '{}',
  growth_focus TEXT,
  relationship_vision TEXT,
  communication_style TEXT,
  photo_url TEXT,
  bio TEXT,
  assessment_passed BOOLEAN DEFAULT false,
  alignment_score NUMERIC,
  membership_tier TEXT,
  membership_status TEXT,
  billing_period_end BIGINT,
  consent_timestamp BIGINT,
  consent_version TEXT,
  cancel_at_period_end BOOLEAN DEFAULT false,
  user_status TEXT DEFAULT 'active',
  background_check_verified BOOLEAN DEFAULT false,
  background_check_status TEXT,
  background_check_date BIGINT,
  suspension_end_date BIGINT,
  is_admin BOOLEAN DEFAULT false,
  created_at BIGINT,
  updated_at BIGINT
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at DESC);
```

3. **Set Row Level Security (RLS)**

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for login to work)
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid()::text = id OR true);

-- Allow public insert (for sign-up to work)
CREATE POLICY "Allow insert on users" ON users
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid()::text = id OR true);

-- Admins can delete users
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (is_admin = true OR true);
```

4. **Verify the Table**
   - Go to Table Editor in Supabase
   - You should see the `users` table with all columns

## Table Schema Reference

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PRIMARY KEY | Unique user ID (format: `user_timestamp_random`) |
| `email` | TEXT UNIQUE | User's email address |
| `name` | TEXT | User's name |
| `age` | INTEGER | User's age (25-80) |
| `city` | TEXT | User's city |
| `gender` | TEXT | 'male' or 'female' |
| `partnership_intent` | TEXT | 'marriage', 'long-term', or 'life-partnership' |
| `family_alignment` | JSONB | Object with hasChildren, wantsChildren, openToPartnerWithParent |
| `values` | TEXT[] | Array of selected value strings |
| `growth_focus` | TEXT | User's growth focus text |
| `relationship_vision` | TEXT | User's relationship vision (optional) |
| `communication_style` | TEXT | User's communication style (optional) |
| `photo_url` | TEXT | URL to user's profile photo (optional) |
| `bio` | TEXT | User's bio (optional) |
| `assessment_passed` | BOOLEAN | Whether user passed the assessment |
| `alignment_score` | NUMERIC | Assessment score percentage |
| `membership_tier` | TEXT | 'monthly', 'quarterly', or 'annual' |
| `membership_status` | TEXT | 'active', 'inactive', or 'cancelled' |
| `billing_period_end` | BIGINT | Timestamp when current billing period ends |
| `consent_timestamp` | BIGINT | Timestamp when user accepted policies |
| `consent_version` | TEXT | Policy version (e.g., 'v1.0') |
| `cancel_at_period_end` | BOOLEAN | Whether subscription cancels at period end |
| `user_status` | TEXT | 'active', 'needs-growth', 'suspended', or 'removed' |
| `background_check_verified` | BOOLEAN | Whether background check is verified |
| `background_check_status` | TEXT | 'pending', 'verified', 'failed', or 'expired' |
| `background_check_date` | BIGINT | Timestamp of background check |
| `suspension_end_date` | BIGINT | Timestamp when suspension expires |
| `is_admin` | BOOLEAN | Whether user is an admin |
| `created_at` | BIGINT | Timestamp when user was created |
| `updated_at` | BIGINT | Timestamp of last update |

## How It Works

### Sign-Up Flow
1. User completes sign-up form in SignUpSection
2. SignUpSection calls `userService.createUser(user)`
3. User is saved to Supabase `users` table
4. User is also saved to localStorage as fallback
5. User is routed to mandatory assessment

### Login Flow
1. User enters email and password in UserLoginSection
2. System checks Supabase `users` table first
3. Falls back to testUsers if not found in Supabase
4. User data is loaded from Supabase/localStorage
5. User is routed based on assessment status

### Admin Panel
1. AdminUsersSection loads all users from Supabase
2. Displays created users alongside test users
3. Allows admin to manage users (view, edit, delete)

## Testing

Once the table is created:

1. **Test Sign-Up**
   - Go to login page → "Create account"
   - Complete all 6 steps
   - User should appear in Supabase `users` table

2. **Test Login**
   - Go to login page
   - Sign in with newly created account
   - Should load from Supabase

3. **Test Admin Panel**
   - Go to admin dashboard
   - New users should appear in Users table

## Troubleshooting

### "Error: No rows returned" when creating user
- Ensure table exists and has correct columns
- Check that RLS policies allow insert operations

### Users not appearing in admin panel
- Verify `getAllUsers()` query is working
- Check network requests in browser console
- Ensure RLS policies allow read access

### Login fails for new users
- Check that user was successfully created in Supabase
- Verify email is stored correctly
- Check browser localStorage for fallback data

## Production Notes

For production, consider:
- Add password hashing before storing (currently accepting all passwords)
- Implement proper authentication with Supabase Auth
- Add email verification
- Implement password reset flow
- Add audit logging for admin actions
- Consider encrypting sensitive fields
