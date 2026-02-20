# Supabase Blog Table Setup

This document explains how to set up the Supabase database table for the Community Blog feature.

## Blog Table Structure

The application expects a `blogs` table in Supabase with the following structure:

### SQL to Create the Table

```sql
CREATE TABLE blogs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  author TEXT,
  read_time TEXT,
  published BOOLEAN DEFAULT false,
  module_only BOOLEAN DEFAULT false,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  created_at_timestamp TIMESTAMP DEFAULT NOW()
);
```

### Column Descriptions

- **id**: Unique identifier (format: `blog{timestamp}`)
- **title**: Article title (required)
- **content**: Full article content (required)
- **category**: Article category, e.g., "Emotional Regulation" (required)
- **excerpt**: Brief summary for blog listings (required)
- **author**: Author name (optional)
- **read_time**: Estimated read time, e.g., "5 min" (optional)
- **published**: Whether the article is visible to users (default: false)
- **module_only**: If true, only visible in modules, not on community blog (default: false)
- **created_at**: Timestamp when article was created (milliseconds since epoch)
- **updated_at**: Timestamp when article was last updated (milliseconds since epoch)

## Setting Up in Supabase

### Option 1: Using the Supabase UI

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Click "New query"
4. Copy and paste the SQL from above
5. Click "Run"

### Option 2: Using the Supabase CLI

```bash
supabase migration new create_blogs_table
# Add the SQL to the migration file
supabase db push
```

## Verification

After creating the table, verify it was set up correctly:

1. In the Supabase dashboard, go to **Database** → **Tables**
2. You should see the `blogs` table
3. The columns should match the structure above

## Troubleshooting

### Articles aren't being saved to database

Check the browser console (DevTools) for error messages. Look for logs like:
- "Blog successfully saved to Supabase" - indicates success
- "Supabase blog write failed" - indicates a failure with details

### Blogs aren't loading

In the Admin Dashboard, when you open the Community Blog tab, check the console for:
- "Successfully loaded X published blogs from Supabase" - success
- "Failed to fetch blogs from Supabase" - connection or table issue

### Common Issues

1. **Table doesn't exist**: Create it using the SQL above
2. **Permission denied**: Check your Supabase Row Level Security (RLS) policies
3. **Wrong Supabase credentials**: Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` file
