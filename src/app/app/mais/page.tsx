import { signOut } from "./actions";

export default function MaisPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-semibold">Mais</h1>
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
