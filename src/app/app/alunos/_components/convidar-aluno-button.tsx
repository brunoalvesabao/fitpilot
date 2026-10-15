"use client";

import { useState, useTransition } from "react";
import { X, Copy, Check, UserPlus } from "lucide-react";
import { gerarConviteAluno } from "../actions";

export function ConvidarAlunoButton({ alunoId }: { alunoId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pending, startTransition] = useTransition();

  function gerar() {
    setErro(false);
    startTransition(async () => {
      const resultado = await gerarConviteAluno(alunoId);
      if (!resultado.success || !resultado.token) {
        setErro(true);
        return;
      }
      setLink(`${window.location.origin}/aluno/ativar?token=${resultado.token}`);
    });
  }

  function copiar() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={gerar}
        className="flex h-touch items-center gap-2 rounded-full border border-primary px-4 text-sm font-semibold text-primary disabled:opacity-60"
      >
        <UserPlus className="size-4" aria-hidden />
        {pending ? "Gerando link..." : "Convidar para o app do aluno"}
      </button>

      {erro && <p className="text-xs text-red">Não foi possível gerar o convite.</p>}

      {link && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setLink(null)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            className="relative flex flex-col gap-3 rounded-t-card border-t border-border bg-surface p-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Convite gerado</h2>
              <button
                type="button"
                onClick={() => setLink(null)}
                aria-label="Fechar"
                className="flex size-9 items-center justify-center text-fg-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <p className="text-sm text-fg-muted">
              Envie este link pro aluno (por WhatsApp, por exemplo). Ele vai poder criar uma
              conta e ver as próprias aulas e vagas de reposição. Válido até ele usar.
            </p>
            <div className="flex items-center gap-2 rounded-card border border-border bg-bg px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{link}</span>
              <button
                type="button"
                onClick={copiar}
                aria-label="Copiar link"
                className="flex size-9 shrink-0 items-center justify-center text-primary"
              >
                {copiado ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
