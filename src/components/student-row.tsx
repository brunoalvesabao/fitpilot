import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { StatusPill, Pill } from "@/components/status-pill";
import { formatCurrencyBRL, planoLabel } from "@/lib/format";
import type { Aluno } from "@/types/database";

function secondaryLine(aluno: Aluno): string {
  if (!aluno.plano_tipo) return "Sem plano definido";

  let line = planoLabel(aluno.plano_tipo);
  if (aluno.valor_mensal != null) {
    line += ` ${formatCurrencyBRL(aluno.valor_mensal)}`;
  }
  if (aluno.dia_vencimento != null) {
    line += ` · vence dia ${aluno.dia_vencimento}`;
  } else if (aluno.aulas_por_mes != null) {
    line += ` · ${aluno.aulas_por_mes} aulas/mês`;
  }
  return line;
}

export function StudentRow({
  aluno,
  reposicoesCount,
}: {
  aluno: Aluno;
  reposicoesCount: number;
}) {
  return (
    <Link
      href={`/app/alunos/${aluno.id}`}
      className="flex min-h-touch items-center gap-3 border-b border-border px-4 py-3"
    >
      <Avatar nome={aluno.nome} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{aluno.nome}</p>
        <p className="truncate text-sm text-fg-muted">{secondaryLine(aluno)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusPill status={aluno.status} />
        {reposicoesCount > 0 && (
          <Pill color="blue">{reposicoesCount} reposições</Pill>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-fg-faint" aria-hidden />
    </Link>
  );
}
