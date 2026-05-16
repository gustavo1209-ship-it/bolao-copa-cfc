-- ============================================================
-- Bolão Copa 2026 – Schema Supabase
-- ============================================================

-- Perfis dos participantes
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trigger: criar perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Partidas da Copa 2026
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  home_team_flag text,
  away_team_flag text,
  home_score integer,
  away_score integer,
  match_date timestamptz not null,
  stage text not null check (stage in (
    'group', 'round_of_32', 'round_of_16',
    'quarterfinal', 'semifinal', 'third_place', 'final'
  )),
  group_name text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'finished')),
  sofascore_id integer,
  created_at timestamptz not null default now()
);

-- Palpites dos participantes
create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  home_score_prediction integer not null,
  away_score_prediction integer not null,
  pts_result integer not null default 0,
  pts_home_goals integer not null default 0,
  pts_away_goals integer not null default 0,
  pts_exact_bonus integer not null default 0,
  pts_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, match_id)
);

-- View de classificação
create or replace view public.standings as
select
  p.id,
  p.name,
  p.email,
  coalesce(sum(pr.pts_total), 0) as total_pts,
  count(case when pr.pts_exact_bonus > 0 then 1 end) as exact_scores,
  count(case when pr.pts_result > 0 then 1 end) as correct_results,
  rank() over (order by coalesce(sum(pr.pts_total), 0) desc) as rank
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
group by p.id, p.name, p.email;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

-- Profiles: todos autenticados leem, cada um edita o próprio
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- Matches: leitura pública; escrita só admin
create policy "matches_select" on public.matches
  for select using (true);

create policy "matches_insert" on public.matches
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "matches_update" on public.matches
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "matches_delete" on public.matches
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Predictions: usuário lê/escreve apenas as próprias
create policy "predictions_select" on public.predictions
  for select using (auth.uid() = user_id);

create policy "predictions_insert" on public.predictions
  for insert with check (auth.uid() = user_id);

create policy "predictions_update" on public.predictions
  for update using (auth.uid() = user_id);

-- Admin pode atualizar pontuações (via API route com service role ou via admin_uid check)
create policy "predictions_admin_update" on public.predictions
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
