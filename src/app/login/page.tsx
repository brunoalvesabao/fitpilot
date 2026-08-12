"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

const inputClasses =
  "h-touch rounded-card border border-border bg-surface px-4 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-primary";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Acesse sua conta do FitPilot
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-4">
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
              autoComplete="current-password"
              className={inputClasses}
            />
          </div>

          {state.error && <p className="text-sm text-red">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 h-touch rounded-card bg-primary font-medium text-bg transition-opacity disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-muted">
          Não tem conta?{" "}
          <Link href="/cadastro" className="text-primary">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
