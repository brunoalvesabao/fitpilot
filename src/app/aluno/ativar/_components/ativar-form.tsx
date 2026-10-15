"use client";

import { useActionState } from "react";
import { ativarConvite, type AtivarState } from "../actions";

const initialState: AtivarState = { error: null };

const inputClasses =
  "h-touch rounded-card border border-border bg-surface px-4 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-primary";

export function AtivarForm({ token, nomeAluno }: { token: string; nomeAluno: string }) {
  const action = ativarConvite.bind(null, token);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="nome" value={nomeAluno} />
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
          Crie uma senha
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

      {state.error && <p className="text-sm text-red">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-touch rounded-card bg-primary font-medium text-bg transition-opacity disabled:opacity-60"
      >
        {pending ? "Criando conta..." : "Criar minha conta"}
      </button>
    </form>
  );
}
