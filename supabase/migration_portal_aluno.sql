-- FitPilot — Portal do aluno (login próprio, vagas de reposição, push)
--
-- Rode este arquivo inteiro no SQL Editor do projeto Supabase já em uso
-- (o que já tem o schema.sql aplicado). Seguro de rodar mais de uma vez.
--
-- Também corrige uma lacuna importante: o gatilho que cria o crédito de
-- reposição quando uma aula é cancelada com aviso nunca tinha sido
-- reconstituído no schema.sql original — ou seja, cancelamentos não
-- estavam gerando crédito de reposição neste projeto. Este arquivo
-- conserta isso também.

-- 1. Coluna de vínculo do aluno com o login dele no app -------------------

alter table public.aluno
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null,
  add column if not exists convite_token uuid;

-- 2. Tabela de vagas de reposição (abertas quando uma aula é cancelada) ---

create table if not exists public.vaga_reposicao (
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

create index if not exists vaga_reposicao_profissional_id_idx on public.vaga_reposicao (profissional_id);

alter table public.vaga_reposicao enable row level security;

drop policy if exists "vaga_reposicao_profissional_own" on public.vaga_reposicao;
create policy "vaga_reposicao_profissional_own" on public.vaga_reposicao
  for all using (auth.uid() = profissional_id) with check (auth.uid() = profissional_id);

drop policy if exists "vaga_reposicao_aluno_elegivel" on public.vaga_reposicao;
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

-- 3. Tabela de inscrições push (um registro por dispositivo do aluno) ----

create table if not exists public.inscricao_push (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.aluno (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  criado_em timestamptz not null default now(),
  unique (aluno_id, endpoint)
);

alter table public.inscricao_push enable row level security;

drop policy if exists "inscricao_push_aluno_own" on public.inscricao_push;
create policy "inscricao_push_aluno_own" on public.inscricao_push
  for all using (
    exists (select 1 from public.aluno a where a.id = inscricao_push.aluno_id and a.auth_user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.aluno a where a.id = inscricao_push.aluno_id and a.auth_user_id = auth.uid())
  );

drop policy if exists "inscricao_push_profissional_le_dos_seus_alunos" on public.inscricao_push;
create policy "inscricao_push_profissional_le_dos_seus_alunos" on public.inscricao_push
  for select using (
    exists (
      select 1 from public.aluno a
      where a.id = inscricao_push.aluno_id and a.profissional_id = auth.uid()
    )
  );

-- 4. Políticas de leitura do aluno nas tabelas que já existiam -----------
-- (além das políticas do profissional, que continuam intactas — RLS
-- combina políticas permissivas do mesmo tipo com OR)

drop policy if exists "aluno_le_proprio_registro" on public.aluno;
create policy "aluno_le_proprio_registro" on public.aluno
  for select using (auth.uid() = auth_user_id);

drop policy if exists "aluno_le_proprias_aulas" on public.agendamento;
create policy "aluno_le_proprias_aulas" on public.agendamento
  for select using (
    exists (select 1 from public.aluno a where a.id = agendamento.aluno_id and a.auth_user_id = auth.uid())
  );

drop policy if exists "aluno_le_proprios_creditos" on public.credito_reposicao;
create policy "aluno_le_proprios_creditos" on public.credito_reposicao
  for select using (
    exists (select 1 from public.aluno a where a.id = credito_reposicao.aluno_id and a.auth_user_id = auth.uid())
  );

drop policy if exists "aluno_le_seu_profissional" on public.profissional;
create policy "aluno_le_seu_profissional" on public.profissional
  for select using (
    exists (select 1 from public.aluno a where a.profissional_id = profissional.id and a.auth_user_id = auth.uid())
  );

-- 5. Cadastro: diferencia profissional de aluno, e ativa o convite --------
-- Substitui a função original (que sempre criava uma linha em
-- public.profissional para TODO novo usuário) para também aceitar
-- cadastros de aluno, sem criar uma linha de profissional pra eles, e
-- vinculando a linha de aluno ao novo usuário quando vier com um
-- convite válido — tudo na mesma transação do cadastro, mesmo que a
-- confirmação por email ainda esteja pendente.

create or replace function public.handle_new_user()
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

-- 6. Função pública pra validar um convite antes de mostrar o formulário --

create or replace function public.convite_valido(p_token uuid)
returns table (nome text)
language sql
security definer set search_path = public
stable
as $$
  select nome from public.aluno where convite_token = p_token and auth_user_id is null;
$$;

grant execute on function public.convite_valido(uuid) to anon, authenticated;

-- 7. Corrige o gatilho de cancelamento (crédito + vaga de reposição) ------
-- Esta era a lacuna: o crédito de reposição nunca foi recriado no schema
-- novo. Agora, cancelar com aviso faz duas coisas na mesma transação:
-- gera o crédito (como já acontecia no projeto antigo) e abre uma vaga
-- de reposição pros alunos elegíveis reivindicarem pelo app deles.

create or replace function public.handle_agendamento_cancelado_com_aviso()
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

drop trigger if exists on_agendamento_cancelado_com_aviso on public.agendamento;
create trigger on_agendamento_cancelado_com_aviso
  after insert or update on public.agendamento
  for each row execute function public.handle_agendamento_cancelado_com_aviso();

-- 8. Função que o aluno chama pra reservar uma vaga de reposição ----------
-- SECURITY DEFINER: valida tudo (vaga ainda aberta, pertence ao professor
-- certo, aluno tem crédito disponível) antes de criar o agendamento e
-- consumir o crédito — tudo atômico, com lock na vaga pra evitar dois
-- alunos reservando a mesma vaga ao mesmo tempo.

create or replace function public.aluno_reservar_vaga(p_vaga_id uuid)
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
