"use client";

import { useTransition } from "react";
import { deactivateAluno } from "../actions";

export function DesativarAlunoButton({ alunoId }: { alunoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm("Tem certeza que deseja desativar este aluno?")) {
          startTransition(() => {
            deactivateAluno(alunoId);
          });
        }
      }}
      className="h-touch text-sm font-medium text-red disabled:opacity-60"
    >
      {pending ? "Desativando..." : "Desativar aluno"}
    </button>
  );
}
