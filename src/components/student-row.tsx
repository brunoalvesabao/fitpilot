import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { StatusPill, Pill } from "@/components/status-pill";
import { planoResumo } from "@/lib/format";
import type { Aluno } from "@/types/database";

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
      <Avatar nome={aluno.nome} fotoUrl={aluno.foto_url} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{aluno.nome}</p>
        <p className="truncate text-sm text-fg-muted">{planoResumo(aluno)}</p>
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
