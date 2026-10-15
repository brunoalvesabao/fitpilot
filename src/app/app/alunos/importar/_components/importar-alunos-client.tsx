"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { analisarTextoAlunos, importarAlunosEmLote } from "../actions";
import type { AlunoExtraido } from "@/lib/importacao-ia";

type LinhaRevisao = AlunoExtraido & { incluir: boolean };

const inputClasses =
  "h-10 w-full rounded-card border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-primary";

export function ImportarAlunosClient() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [linhas, setLinhas] = useState<LinhaRevisao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendingAnalise, startAnalise] = useTransition();
  const [pendingImportar, startImportar] = useTransition();

  function analisar() {
    setErro(null);
    startAnalise(async () => {
      const resultado = await analisarTextoAlunos(texto);
      if (!resultado.success || !resultado.alunos) {
        setErro(resultado.error ?? "Não foi possível analisar o texto.");
        return;
      }
      setLinhas(resultado.alunos.map((aluno) => ({ ...aluno, incluir: true })));
    });
  }

  function atualizarLinha(index: number, patch: Partial<LinhaRevisao>) {
    setLinhas((atual) =>
      atual ? atual.map((linha, i) => (i === index ? { ...linha, ...patch } : linha)) : atual,
    );
  }

  function removerLinha(index: number) {
    setLinhas((atual) => (atual ? atual.filter((_, i) => i !== index) : atual));
  }

  function confirmarImportacao() {
    if (!linhas) return;
    setErro(null);
    const selecionados = linhas.filter((l) => l.incluir && l.nome.trim());
    if (selecionados.length === 0) {
      setErro("Selecione pelo menos um aluno para importar.");
      return;
    }
    startImportar(async () => {
      const resultado = await importarAlunosEmLote(
        selecionados.map(({ nome, telefone, valor_mensal, dia_vencimento }) => ({
          nome,
          telefone,
          valor_mensal,
          dia_vencimento,
        })),
      );
      if (!resultado.success) {
        setErro("Não foi possível importar os alunos. Tente novamente.");
        return;
      }
      router.push("/app/alunos");
    });
  }

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
        <h1 className="text-base font-semibold">Importar com IA</h1>
        <div className="size-11" />
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {!linhas ? (
          <>
            <p className="text-sm text-fg-muted">
              Cole uma lista de alunos (de uma planilha, anotação ou conversa). A IA vai tentar
              identificar nome, telefone, valor da mensalidade e dia de vencimento de cada um.
              Confira tudo antes de confirmar — nada é salvo automaticamente.
            </p>
            <textarea
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              placeholder={
                "Exemplo:\nMaria Silva - 11 99999-0000 - R$ 200 - vence dia 5\nJoão Pereira, (11) 98888-7777, 250 reais, todo dia 10"
              }
              rows={10}
              className="min-h-40 rounded-card border border-border bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {erro && <p className="text-sm text-red">{erro}</p>}
            <button
              type="button"
              onClick={analisar}
              disabled={pendingAnalise || !texto.trim()}
              className="h-touch rounded-card bg-primary font-semibold text-bg disabled:opacity-60"
            >
              {pendingAnalise ? "Analisando..." : "Analisar com IA"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-fg-muted">
              Confira e ajuste os dados antes de importar. Desmarque quem não deve ser
              importado.
            </p>
            <div className="flex flex-col gap-3">
              {linhas.map((linha, index) => (
                <div
                  key={index}
                  className={`flex flex-col gap-2 rounded-card border border-border bg-surface p-3 ${
                    linha.incluir ? "" : "opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={linha.incluir}
                      onChange={(event) => atualizarLinha(index, { incluir: event.target.checked })}
                      className="size-5"
                      aria-label={`Incluir ${linha.nome || "aluno"}`}
                    />
                    <input
                      type="text"
                      value={linha.nome}
                      onChange={(event) => atualizarLinha(index, { nome: event.target.value })}
                      placeholder="Nome"
                      className={`${inputClasses} flex-1 font-medium`}
                    />
                    <button
                      type="button"
                      onClick={() => removerLinha(index)}
                      aria-label="Remover linha"
                      className="flex size-9 shrink-0 items-center justify-center text-fg-faint"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pl-7">
                    <input
                      type="text"
                      value={linha.telefone ?? ""}
                      onChange={(event) =>
                        atualizarLinha(index, { telefone: event.target.value || null })
                      }
                      placeholder="Telefone"
                      className={inputClasses}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={linha.valor_mensal ?? ""}
                      onChange={(event) => {
                        const v = event.target.value.replace(",", ".");
                        atualizarLinha(index, {
                          valor_mensal: v.trim() === "" ? null : Number(v),
                        });
                      }}
                      placeholder="Valor (R$)"
                      className={inputClasses}
                    />
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={linha.dia_vencimento ?? ""}
                      onChange={(event) => {
                        const v = event.target.value;
                        atualizarLinha(index, {
                          dia_vencimento: v.trim() === "" ? null : Number(v),
                        });
                      }}
                      placeholder="Dia venc."
                      className={inputClasses}
                    />
                  </div>
                </div>
              ))}
            </div>

            {erro && <p className="text-sm text-red">{erro}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLinhas(null);
                  setErro(null);
                }}
                className="h-touch flex-1 rounded-card border border-border font-medium text-fg"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmarImportacao}
                disabled={pendingImportar}
                className="h-touch flex-[2] rounded-card bg-primary font-semibold text-bg disabled:opacity-60"
              >
                {pendingImportar
                  ? "Importando..."
                  : `Importar ${linhas.filter((l) => l.incluir).length} aluno(s)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
