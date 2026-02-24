# Assessment Results Database Setup

## Overview
Assessment results are now saved to the Supabase database for persistence and admin access.

## SQL to Create Table

Run this SQL in your Supabase project (SQL Editor):

```sql
-- Create assessment_results table
CREATE TABLE IF NOT EXISTS assessment_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  percentage INTEGER NOT NULL,
  integrity_flags TEXT[] DEFAULT '{}',
  growth_areas TEXT[] DEFAULT '{}',
  answered_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS assessment_results_user_id_idx ON assessment_results(user_id);

-- Create index on answered_at for sorting
CREATE INDEX IF NOT EXISTS assessment_results_answered_at_idx ON assessment_results(answered_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own assessment results
CREATE POLICY "Users can read own assessment results"
  ON assessment_results
  FOR SELECT
  USING (auth.uid()::text = user_id OR (SELECT is_admin FROM profiles WHERE id = auth.uid()::text) = true);

-- Policy: Users can insert their own assessment results
CREATE POLICY "Users can insert own assessment results"
  ON assessment_results
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Admins can read all assessment results
-- (relies on above SELECT policy and is_admin flag)
```

## Steps

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Paste the SQL above
5. Click **Run**

## Notes

- Assessment results are linked to users by `user_id`
- Each result is timestamped with `answered_at` and `created_at`
- `integrity_flags` and `growth_areas` are stored as arrays for easy filtering
- Row Level Security ensures users can only see their own results (unless admin)
- Admins can view all assessment results for reporting/analysis

## Testing

After creating the table:

1. Take an assessment and fail it
2. Complete the assessment
3. Log out and back in
4. You should be redirected to growth-mode (not shown the assessment again)
5. Check Supabase **Table Editor** → `assessment_results` to verify the row was created
