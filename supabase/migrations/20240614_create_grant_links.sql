-- Create table for grant links (crew access delegation)
create table if not exists grant_links (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid references vessels(id) on delete cascade,
  crew_id uuid references crew_members(id) on delete set null,
  role text not null,
  email text,
  grant_code text not null unique,
  is_used boolean default false,
  created_at timestamptz default now(),
  used_at timestamptz,
  granted_by uuid references users(id) on delete set null
);

-- Index for quick lookup by grant_code
create index if not exists idx_grant_links_code on grant_links(grant_code); 