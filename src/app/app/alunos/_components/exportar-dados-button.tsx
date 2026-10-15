"use client";

import { useTransition } from "react";
import { exportarDadosAluno } from "../actions";

export function ExportarDadosButton({
  alunoId,
  alunoNome,
}: {
  alunoId: string;
  alunoNome: string;
}) {
  const [pending, startTransition] = useTransition();

  function exportar() {
    startTransition(async () => {
      const resultado = await exportarDadosAluno(alunoId);
      if (!resultado.success) {
        window.alert("Não foi possível exportar os dados. Tente novamente.");
        return;
      }

      const blob = new Blob([JSON.stringify(resultado.dados, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const nomeArquivo = alunoNome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      link.download = `fitpilot-${nomeArquivo || "aluno"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={exportar}
      className="h-touch text-sm font-medium text-fg-muted disabled:opacity-60"
    >
      {pending ? "Exportando..." : "Exportar dados (LGPD)"}
    </button>
  );
}
