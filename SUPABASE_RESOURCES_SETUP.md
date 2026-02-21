# Supabase Growth Resources Table Setup

This document explains how to set up the Supabase database table for Growth Resources (modules and their attached blogs).

## Resources Table Structure

The application expects a `growth_resources` table in Supabase with the following structure:

### SQL to Create the Table

```sql
CREATE TABLE growth_resources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on type for faster queries
CREATE INDEX idx_growth_resources_type ON growth_resources(type);
```

### Column Descriptions

- **id**: Unique identifier (format: `resources_free` or `resources_paid`)
- **type**: Type of resources - either 'free' or 'paid'
- **data**: JSONB array containing all GrowthResource objects with their modules and attached blogIds
- **updated_at**: Timestamp when resources were last updated (milliseconds since epoch)
- **created_at**: Automatic timestamp when record was created

## How It Works

When an admin saves resources:
1. All resources for that type (free/paid) are serialized as JSON
2. The entire array is stored in a single record identified by `resources_free` or `resources_paid`
3. When users load the growth mode, they fetch the resources from this table
4. All users see the same resource configuration

## Setting Up in Supabase

### Option 1: Using the Supabase UI

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Click "New query"
4. Copy and paste the SQL from above
5. Click "Run"

### Option 2: Using the Supabase CLI

```bash
supabase migration new create_growth_resources_table
# Add the SQL to the migration file
supabase db push
```

## Verification

After creating the table, verify it was set up correctly:

1. In the Supabase dashboard, go to **Database** → **Tables**
2. You should see the `growth_resources` table
3. The columns should match the structure above

## Troubleshooting

### Resources aren't saving to database

Check the browser console (DevTools) for error messages. Look for logs like:
- "Resources (free) saved to Supabase" - indicates success
- "Failed to save resources to Supabase" - indicates a failure with details

### Resources aren't loading

In Growth Mode, check the console for:
- "Loaded free resources from Supabase: X" - success
- "Failed to fetch free resources from Supabase" - connection or table issue

### Admin sees changes but users don't

This usually means the resources weren't saved to Supabase. Make sure the admin clicks **Save** button after making changes. The save process now:
1. Updates local state (in admin's browser)
2. Saves to localStorage (for admin's local persistence)
3. **Saves to Supabase** (so all users see it)

If step 3 fails, users won't see the changes. Check for error messages in the admin's console.

## Key Features

- **Shared Configuration**: All users see the same resources because they load from a single Supabase record
- **Module Blogs**: Resources include `blogIds` arrays on modules that reference the blogs table
- **Type Separation**: Free and paid resources are stored separately
- **Fallback**: If Supabase is unavailable, falls back to localStorage (for admin) or defaults
