-- FitPilot — schema completo do banco (Supabase/Postgres)
--
-- Rode este arquivo inteiro, de uma vez, no SQL Editor de um projeto
-- Supabase novo (ou recém-criado) para deixá-lo pronto para o app.
-- Reconstituído a partir de src/types/database.ts e das queries reais
-- do app, já que o schema nunca tinha sido salvo como migration.

create extension if not exists "pgcrypto";

-- 1. Tabelas -----------------------------------------------------------

create table public.profissional (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.status_aluno as enum ('ativo', 'vencendo', 'inadimplente', 'pausa', 'ex_aluno', 'lead');

create table public.aluno (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissional (id) on delete cascade,
  nome text not null,
  telefone text,
  foto_url text,
  valor_mensal numeric,
  dia_vencimento smallint check (dia_vencimento between 1 and 31),
  aulas_por_mes smallint,
  status public.status_aluno not null default 'ativo',
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index aluno_profissional_id_idx on public.aluno (profissional_id);

create table public.horario_fixo (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.aluno (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora time not null,
  local text
);

create index horario_fixo_aluno_id_idx on public.horario_fixo (aluno_id);

create type public.status_agendamento as enum ('agendado', 'realizada', 'falta', 'cancelado_com_aviso');

create table public.agendamento (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissional (id) on delete cascade,
  aluno_id uuid not null references public.aluno (id) on delete cascade,
  data_hora timestamptz not null,
  duracao_min smallint not null default 60,
  status public.status_agendamento not null default 'agendado',
  local text,
  criado_em timestamptz not null default now()
);

create index agendamento_profissional_id_idx on public.agendamento (profissional_id);
create index agendamento_aluno_id_idx on public.agendamento (aluno_id);
create index agendamento_data_hora_idx on public.agendamento (data_hora);

create type public.metodo_pagamento as enum ('pix', 'dinheiro', 'cartao', 'transferencia', 'outro');

create table public.pagamento (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissional (id) on delete cascade,
  aluno_id uuid not null references public.aluno (id) on delete cascade,
  competencia date not null, -- sempre o dia 1 do mês de referência
  valor numeric not null,
  data_pagamento date, -- null enquanto não pago
  metodo public.metodo_pagamento,
  criado_em timestamptz not null default now(),
  unique (aluno_id, competencia)
);

create index pagamento_profissional_id_idx on public.pagamento (profissional_id);
create index pagamento_aluno_id_idx on public.pagamento (aluno_id);

create table public.credito_reposicao (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.aluno (id) on delete cascade,
  agendamento_origem uuid references public.agendamento (id) on delete set null,
  usado boolean not null default false,
  expira_em date,
  criado_em timestamptz not null default now()
);

create index credito_reposicao_aluno_id_idx on public.credito_reposicao (aluno_id);

create table public.config_modulos (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null unique references public.profissional (id) on delete cascade,
  modulo_financeiro boolean not null default true,
  modulo_reposicao boolean not null default true,
  modulo_avaliacao boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.config_reposicao (
  profissional_id uuid primary key references public.profissional (id) on delete cascade,
  permitir boolean not null default true,
  antecedencia_horas smallint not null default 12,
  expira_mes_seguinte boolean not null default true
);

create table public.bloqueio (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissional (id) on delete cascade,
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text
);

create index bloqueio_profissional_id_idx on public.bloqueio (profissional_id);

-- 2. Trigger: cria a linha em "profissional" automaticamente no cadastro ---

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profissional (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Row Level Security: cada profissional só vê/edita os próprios dados ---

alter table public.profissional enable row level security;
alter table public.aluno enable row level security;
alter table public.horario_fixo enable row level security;
alter table public.agendamento enable row level security;
alter table public.pagamento enable row level security;
alter table public.credito_reposicao enable row level security;
alter table public.config_modulos enable row level security;
alter table public.config_reposicao enable row level security;
alter table public.bloqueio enable row level security;

create policy "profissional_self" on public.profissional
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "aluno_own" on public.aluno
  for all using (auth.uid() = profissional_id) with check (auth.uid() = profissional_id);

create policy "horario_fixo_own" on public.horario_fixo
  for all using (
    exists (select 1 from public.aluno a where a.id = horario_fixo.aluno_id and a.profissional_id = auth.uid())
  )
  with check (
    exists (select 1 from public.aluno a where a.id = horario_fixo.aluno_id and a.profissional_id = auth.uid())
  );

create policy "agendamento_own" on public.agendamento
  for all using (auth.uid() = profissional_id) with check (auth.uid() = profissional_id);

create policy "pagamento_own" on public.pagamento
  for all using (auth.uid() = profissional_id) with check (auth.uid() = profissional_id);

create policy "credito_reposicao_own" on public.credito_reposicao
  for all using (
    exists (select 1 from public.aluno a where a.id = credito_reposicao.aluno_id and a.profissional_id = auth.uid())
  )
  with check (
    exists (select 1 from public.aluno a where a.id = credito_reposicao.aluno_id and a.profissional_id = auth.uid())
  );

create policy "config_modulos_own" on public.config_modulos
  for all using (auth.uid() = profissional_id) with check (auth.uid() = profissional_id);

create policy "config_reposicao_own" on public.config_reposicao
  for all using (auth.uid() = profissional_id) with check (auth.uid() = profissional_id);

create policy "bloqueio_own" on public.bloqueio
  for all using (auth.uid() = profissional_id) with check (auth.uid() = profissional_id);
