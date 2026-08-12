import Link from "next/link";
import { ChevronRight, RotateCcw } from "lucide-react";
import { signOut } from "./actions";

export default function MaisPage() {
  return (
    <div className="flex flex-col px-4 py-6">
      <h1 className="text-xl font-semibold">Mais</h1>

      <div className="mt-6 flex flex-col overflow-hidden rounded-card border border-border">
        <Link
          href="/app/mais/reposicao"
          className="flex min-h-touch items-center gap-3 bg-surface px-4 py-3"
        >
          <RotateCcw className="size-5 shrink-0 text-fg-muted" aria-hidden />
          <span className="min-w-0 flex-1 text-sm font-medium">Reposição de aulas</span>
          <ChevronRight className="size-4 shrink-0 text-fg-faint" aria-hidden />
        </Link>
      </div>

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="h-touch w-full rounded-card border border-border bg-surface font-medium text-red"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
