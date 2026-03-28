create table if not exists instagram_dashboard_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  results jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_ig_dashboard_user_id
  on instagram_dashboard_results(user_id);
