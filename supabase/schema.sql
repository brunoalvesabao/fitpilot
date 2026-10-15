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
  criado_em timestamptz not null default now(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  convite_token uuid
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

create table public.vaga_reposicao (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissional (id) on delete cascade,
  data_hora timestamptz not null,
  duracao_min smallint not null default 60,
  local text,
  origem_agendamento_id uuid references public.agendamento (id) on delete set null,
  status text not null default 'aberta' check (status in ('aberta', 'reservada', 'cancelada')),
  aluno_reservou_id uuid references public.aluno (id) on delete set null,
  criado_em timestamptz not null default now()
);

create index vaga_reposicao_profissional_id_idx on public.vaga_reposicao (profissional_id);

create table public.inscricao_push (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.aluno (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  criado_em timestamptz not null default now(),
  unique (aluno_id, endpoint)
);

-- 2. Cadastro: cria a linha em "profissional" (ou vincula o convite do
--    aluno, se for esse o caso) automaticamente no momento do auth.signUp ---

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tipo text := coalesce(new.raw_user_meta_data ->> 'tipo', 'profissional');
  v_token text := new.raw_user_meta_data ->> 'convite_token';
begin
  if v_tipo = 'aluno' then
    if v_token is not null then
      update public.aluno
      set auth_user_id = new.id, convite_token = null
      where convite_token = v_token::uuid and auth_user_id is null;
    end if;
    return new;
  end if;

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

create function public.convite_valido(p_token uuid)
returns table (nome text)
language sql
security definer set search_path = public
stable
as $$
  select nome from public.aluno where convite_token = p_token and auth_user_id is null;
$$;

grant execute on function public.convite_valido(uuid) to anon, authenticated;

-- Cancelamento com aviso: gera o crédito de reposição e abre uma vaga
-- pros alunos elegíveis (com crédito disponível) reivindicarem pelo app.

create function public.handle_agendamento_cancelado_com_aviso()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_expira_mes_seguinte boolean;
  v_expira_em date;
begin
  if new.status = 'cancelado_com_aviso'
     and (tg_op = 'INSERT' or old.status is distinct from 'cancelado_com_aviso') then

    select expira_mes_seguinte into v_expira_mes_seguinte
    from public.config_reposicao where profissional_id = new.profissional_id;

    if coalesce(v_expira_mes_seguinte, true) then
      v_expira_em := (
        date_trunc('month', (new.data_hora at time zone 'America/Sao_Paulo'))
        + interval '2 months' - interval '1 day'
      )::date;
    else
      v_expira_em := null;
    end if;

    insert into public.credito_reposicao (aluno_id, agendamento_origem, expira_em)
    values (new.aluno_id, new.id, v_expira_em);

    insert into public.vaga_reposicao
      (profissional_id, data_hora, duracao_min, local, origem_agendamento_id, status)
    values
      (new.profissional_id, new.data_hora, new.duracao_min, new.local, new.id, 'aberta');
  end if;

  return new;
end;
$$;

create trigger on_agendamento_cancelado_com_aviso
  after insert or update on public.agendamento
  for each row execute function public.handle_agendamento_cancelado_com_aviso();

-- Reserva de vaga pelo aluno: valida tudo e já cria o agendamento e
-- consome o crédito, atomicamente (lock na vaga evita reserva dupla).

create function public.aluno_reservar_vaga(p_vaga_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_aluno record;
  v_vaga record;
  v_credito_id uuid;
begin
  select * into v_aluno from public.aluno where auth_user_id = auth.uid();
  if v_aluno.id is null then
    raise exception 'Nenhum aluno vinculado a este usuário.';
  end if;

  select * into v_vaga from public.vaga_reposicao where id = p_vaga_id for update;
  if v_vaga.id is null or v_vaga.status <> 'aberta' then
    raise exception 'Esta vaga não está mais disponível.';
  end if;

  if v_vaga.profissional_id <> v_aluno.profissional_id then
    raise exception 'Esta vaga não pertence ao seu professor.';
  end if;

  select id into v_credito_id
  from public.credito_reposicao
  where aluno_id = v_aluno.id and usado = false
    and (expira_em is null or expira_em >= current_date)
  order by expira_em nulls last
  limit 1
  for update;

  if v_credito_id is null then
    raise exception 'Você não tem crédito de reposição disponível.';
  end if;

  update public.vaga_reposicao
  set status = 'reservada', aluno_reservou_id = v_aluno.id
  where id = p_vaga_id;

  insert into public.agendamento (profissional_id, aluno_id, data_hora, duracao_min, status, local)
  values (v_vaga.profissional_id, v_aluno.id, v_vaga.data_hora, v_vaga.duracao_min, 'agendado', v_vaga.local);

  update public.credito_reposicao set usado = true where id = v_credito_id;
end;
$$;

grant execute on function public.aluno_reservar_vaga(uuid) to authenticated;

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
alter table public.vaga_reposicao enable row level security;
alter table public.inscricao_push enable row level security;

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

create policy "vaga_reposicao_profissional_own" on public.vaga_reposicao
  for all using (auth.uid() = profissional_id) with check (auth.uid() = profissional_id);

create policy "vaga_reposicao_aluno_elegivel" on public.vaga_reposicao
  for select using (
    status = 'aberta' and exists (
      select 1 from public.aluno a
      where a.auth_user_id = auth.uid()
        and a.profissional_id = vaga_reposicao.profissional_id
        and exists (
          select 1 from public.credito_reposicao cr
          where cr.aluno_id = a.id and cr.usado = false
            and (cr.expira_em is null or cr.expira_em >= current_date)
        )
    )
  );

create policy "inscricao_push_aluno_own" on public.inscricao_push
  for all using (
    exists (select 1 from public.aluno a where a.id = inscricao_push.aluno_id and a.auth_user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.aluno a where a.id = inscricao_push.aluno_id and a.auth_user_id = auth.uid())
  );

create policy "inscricao_push_profissional_le_dos_seus_alunos" on public.inscricao_push
  for select using (
    exists (
      select 1 from public.aluno a
      where a.id = inscricao_push.aluno_id and a.profissional_id = auth.uid()
    )
  );

-- 4. Leitura do aluno (via o app dele) nas tabelas do professor -----------
-- Permissivas, somadas (OR) às políticas do profissional acima — o aluno
-- só enxerga a própria ficha, as próprias aulas e os próprios créditos.

create policy "aluno_le_proprio_registro" on public.aluno
  for select using (auth.uid() = auth_user_id);

create policy "aluno_le_proprias_aulas" on public.agendamento
  for select using (
    exists (select 1 from public.aluno a where a.id = agendamento.aluno_id and a.auth_user_id = auth.uid())
  );

create policy "aluno_le_proprios_creditos" on public.credito_reposicao
  for select using (
    exists (select 1 from public.aluno a where a.id = credito_reposicao.aluno_id and a.auth_user_id = auth.uid())
  );

create policy "aluno_le_seu_profissional" on public.profissional
  for select using (
    exists (select 1 from public.aluno a where a.profissional_id = profissional.id and a.auth_user_id = auth.uid())
  );
