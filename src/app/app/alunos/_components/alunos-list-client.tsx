"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { SegmentedControl } from "@/components/segmented-control";
import { StudentRow, type AlunoListItem } from "@/components/student-row";

type Filtro = "todos" | "pendentes" | "inativos";

const filtroOptions: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendentes", label: "Pendentes" },
  { value: "inativos", label: "Inativos" },
];

export function AlunosListClient({
  alunos,
  reposicoesPorAluno,
}: {
  alunos: AlunoListItem[];
  reposicoesPorAluno: Record<string, number>;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const ativosCount = useMemo(
    () => alunos.filter((aluno) => aluno.ativo).length,
    [alunos],
  );

  const filtrados = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();
    return alunos.filter((aluno) => {
      if (buscaNormalizada && !aluno.nome.toLowerCase().includes(buscaNormalizada)) {
        return false;
      }
      if (filtro === "pendentes") {
        return aluno.status === "vencendo" || aluno.status === "inadimplente";
      }
      if (filtro === "inativos") {
        return !aluno.ativo;
      }
      return true;
    });
  }, [alunos, busca, filtro]);

  const grupos = useMemo(() => {
    const groups: { letra: string; alunos: AlunoListItem[] }[] = [];
    for (const aluno of filtrados) {
      const letra = aluno.nome.trim()[0]?.toUpperCase() ?? "#";
      const ultimo = groups[groups.length - 1];
      if (ultimo && ultimo.letra === letra) {
        ultimo.alunos.push(aluno);
      } else {
        groups.push({ letra, alunos: [aluno] });
      }
    }
    return groups;
  }, [filtrados]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pb-4 pt-6">
        <h1 className="text-xl font-semibold">Alunos</h1>
        <p className="mt-0.5 text-sm text-fg-muted">{ativosCount} ativos</p>

        <div className="mt-4 flex items-center gap-2 rounded-card border border-border bg-surface px-3">
          <Search className="size-4 shrink-0 text-fg-faint" aria-hidden />
          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome"
            className="h-touch w-full bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none"
          />
        </div>

        <div className="mt-3">
          <SegmentedControl options={filtroOptions} value={filtro} onChange={setFiltro} />
        </div>
      </div>

      {alunos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-fg-muted">Nenhum aluno ainda</p>
          <Link
            href="/app/alunos/novo"
            className="flex h-touch items-center justify-center rounded-card bg-primary px-5 font-medium text-bg"
          >
            Adicionar primeiro aluno
          </Link>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="text-fg-muted">Nenhum aluno encontrado.</p>
        </div>
      ) : (
        <div>
          {grupos.map((grupo) => (
            <div key={grupo.letra}>
              <div className="bg-bg px-4 py-1.5 text-xs font-semibold text-fg-faint">
                {grupo.letra}
              </div>
              {grupo.alunos.map((aluno) => (
                <StudentRow
                  key={aluno.id}
                  aluno={aluno}
                  reposicoesCount={reposicoesPorAluno[aluno.id] ?? 0}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <Link
        href="/app/alunos/novo"
        aria-label="Adicionar aluno"
        className="fixed z-40 flex size-14 items-center justify-center rounded-full bg-primary text-bg"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)", right: "20px" }}
      >
        <Plus className="size-6" aria-hidden />
      </Link>
    </div>
  );
}
