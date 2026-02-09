-- Create seaports table
create table if not exists public.seaports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  classification int,
  province text,
  district text,
  ward text,
  status text,
  latitude double precision,
  longitude double precision,
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.seaports enable row level security;

-- Policy: Only admin/editor can insert, update, delete
create policy "Admins and Editors can do anything"
  on public.seaports
  for all
  using (
    auth.role() = 'admin' or auth.role() = 'editor'
  )
  with check (
    auth.role() = 'admin' or auth.role() = 'editor'
  );

-- Add image_url column if it doesn't exist
alter table public.seaports add column if not exists image_url text;

TRUNCATE TABLE public.seaports RESTART IDENTITY CASCADE; 