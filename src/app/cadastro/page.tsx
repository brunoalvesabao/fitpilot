"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signup, type AuthState } from "./actions";

const initialState: AuthState = { error: null, message: null };

const inputClasses =
  "h-touch rounded-card border border-border bg-surface px-4 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-primary";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  return (
    <div className="flex h-full flex-col justify-center overflow-y-auto px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Criar conta</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Comece a usar o FitPilot gratuitamente
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nome" className="text-sm text-fg-muted">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              autoComplete="name"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm text-fg-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-fg-muted">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClasses}
            />
          </div>

          <label className="flex items-start gap-2.5 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(event) => setAceitouTermos(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>
              Li e concordo com os{" "}
              <Link href="/termos" target="_blank" className="text-primary">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="text-primary">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>

          {state.error && <p className="text-sm text-red">{state.error}</p>}
          {state.message && (
            <p className="text-sm text-primary">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending || !aceitouTermos}
            className="mt-2 h-touch rounded-card bg-primary font-medium text-bg transition-opacity disabled:opacity-60"
          >
            {pending ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
