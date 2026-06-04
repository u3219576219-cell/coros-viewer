# COROS Viewer

Public workout diary for COROS FIT/TCX files.

## Supabase SQL
Run this in Supabase → SQL Editor:

```sql
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text,
  sport text,
  started_at timestamptz,
  duration_sec double precision,
  distance_m double precision,
  avg_hr double precision,
  max_hr double precision,
  calories double precision,
  ascent_m double precision,
  load_score double precision,
  points jsonb default '[]'::jsonb,
  source_file text
);

alter table workouts enable row level security;

drop policy if exists "public read workouts" on workouts;
create policy "public read workouts"
on workouts for select
to anon
using (true);
```

## Vercel environment variables
Add these in Vercel → Project → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPLOAD_PASSWORD`

## Pages
- `/` public diary
- `/upload` upload FIT/TCX, protected by password only in form
- `/workout/[id]` workout details
