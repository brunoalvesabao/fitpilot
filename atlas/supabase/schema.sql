-- Atlas — tabela única de dados por usuário (mesmo modelo do Nexus/Nocturne).
-- Rode no SQL Editor do Supabase. Cada usuário só lê e grava a própria linha.

create table if not exists public.atlas_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.atlas_data enable row level security;

drop policy if exists "atlas_data: dono lê" on public.atlas_data;
drop policy if exists "atlas_data: dono insere" on public.atlas_data;
drop policy if exists "atlas_data: dono atualiza" on public.atlas_data;

create policy "atlas_data: dono lê" on public.atlas_data
  for select using (auth.uid() = user_id);
create policy "atlas_data: dono insere" on public.atlas_data
  for insert with check (auth.uid() = user_id);
create policy "atlas_data: dono atualiza" on public.atlas_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
