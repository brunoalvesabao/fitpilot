import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { StatTile } from "@/components/stat-tile";
import {
  formatCurrencyBRL,
  formatDateBR,
  planoLabel,
  whatsappHref,
  telHref,
} from "@/lib/format";
import { DesativarAlunoButton } from "../_components/desativar-aluno-button";
import type { Aluno } from "@/types/database";

function currentMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toISODate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { first: toISODate(first), last: toISODate(last) };
}

export default async function AlunoFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-red">
          Não foi possível identificar sua sessão. Faça login novamente.
        </p>
      </div>
    );
  }

  const alunoResult = await supabase
    .from("aluno")
    .select("*")
    .eq("id", id)
    .eq("profissional_id", user.id)
    .maybeSingle();

  if (alunoResult.error) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-red">
          Não foi possível carregar este aluno. Tente novamente em instantes.
        </p>
      </div>
    );
  }

  const aluno = alunoResult.data as Aluno | null;
  if (!aluno) {
    notFound();
  }

  const { first, last } = currentMonthRange();

  const [concluidasResult, faltasResult, reposicoesResult] = await Promise.all([
    supabase
      .from("agendamento")
      .select("id", { count: "exact", head: true })
      .eq("aluno_id", id)
      .eq("profissional_id", user.id)
      .eq("status", "concluido")
      .gte("data", first)
      .lte("data", last),
    supabase
      .from("agendamento")
      .select("id", { count: "exact", head: true })
      .eq("aluno_id", id)
      .eq("profissional_id", user.id)
      .eq("status", "falta"),
    supabase
      .from("credito_reposicao")
      .select("id", { count: "exact", head: true })
      .eq("aluno_id", id)
      .eq("profissional_id", user.id)
      .eq("utilizado", false),
  ]);

  const concluidas = concluidasResult.count ?? 0;
  const faltas = faltasResult.count ?? 0;
  const reposicoes = reposicoesResult.count ?? 0;
  const aulasLabel =
    aluno.aulas_por_mes != null ? `${concluidas}/${aluno.aulas_por_mes}` : `${concluidas}`;

  const whatsapp = whatsappHref(aluno.telefone);
  const tel = telHref(aluno.telefone);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-2">
        <Link
          href="/app/alunos"
          aria-label="Voltar"
          className="flex size-11 items-center justify-center text-fg-muted"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="truncate px-2 text-base font-semibold">{aluno.nome}</h1>
        <Link
          href={`/app/alunos/${aluno.id}/editar`}
          aria-label="Editar aluno"
          className="flex size-11 items-center justify-center text-fg-muted"
        >
          <Pencil className="size-5" aria-hidden />
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <section className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-6 text-center">
          <Avatar nome={aluno.nome} size="lg" />
          <div>
            <p className="text-lg font-semibold">{aluno.nome}</p>
            {aluno.telefone && (
              <p className="text-sm text-fg-muted">{aluno.telefone}</p>
            )}
          </div>
          <div className="flex gap-2">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-touch items-center gap-2 rounded-full border border-border px-4 text-sm font-medium"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            )}
            {tel && (
              <a
                href={tel}
                className="flex h-touch items-center gap-2 rounded-full border border-border px-4 text-sm font-medium"
              >
                <Phone className="size-4" aria-hidden />
                Ligar
              </a>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
          <PlanoRow label="Plano" value={planoLabel(aluno.plano_tipo)} />
          <PlanoRow label="Valor" value={formatCurrencyBRL(aluno.valor_mensal)} />
          <PlanoRow
            label="Aulas por mês"
            value={aluno.aulas_por_mes != null ? String(aluno.aulas_por_mes) : "-"}
          />
          <PlanoRow
            label="Vencimento"
            value={aluno.dia_vencimento != null ? `Dia ${aluno.dia_vencimento}` : "-"}
          />
          <PlanoRow label="Aluno desde" value={formatDateBR(aluno.created_at)} />
        </section>

        <div className="flex gap-2">
          <StatTile label={`Este mês: aulas`} value={aulasLabel} />
          <StatTile label="Faltas" value={String(faltas)} />
          <StatTile label="Reposições" value={String(reposicoes)} emphasis="blue" />
        </div>

        <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Pagamentos</h2>
          <p className="text-sm text-fg-muted">
            Em breve — controle de pagamentos chega na semana 5.
          </p>
        </section>

        <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Histórico de aulas</h2>
          <p className="text-sm text-fg-muted">
            Em breve — histórico completo chega na semana 4.
          </p>
        </section>

        <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Observações</h2>
          <p className="whitespace-pre-wrap text-sm text-fg-muted">
            {aluno.observacoes || "Nenhuma observação."}
          </p>
        </section>

        <div className="flex justify-center pb-4 pt-2">
          <DesativarAlunoButton alunoId={aluno.id} />
        </div>
      </div>
    </div>
  );
}

function PlanoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
