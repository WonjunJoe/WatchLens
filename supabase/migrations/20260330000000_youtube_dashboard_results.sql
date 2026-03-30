create table if not exists youtube_dashboard_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date_from text not null,
  date_to text not null,
  results jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_yt_dashboard_user_id
  on youtube_dashboard_results(user_id);
