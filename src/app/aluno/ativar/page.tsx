import { createClient } from "@/lib/supabase/server";
import { AtivarForm } from "./_components/ativar-form";

export default async function AtivarAlunoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <ConviteInvalido />;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("convite_valido", { p_token: token });
  const nomeAluno = data?.[0]?.nome;

  if (!nomeAluno) {
    return <ConviteInvalido />;
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Olá, {nomeAluno}!</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Crie sua conta pra acompanhar suas aulas e reposições.
        </p>
        <AtivarForm token={token} nomeAluno={nomeAluno} />
      </div>
    </div>
  );
}

function ConviteInvalido() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold">Link inválido</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Este convite não existe mais ou já foi usado. Peça um novo link ao seu professor.
      </p>
    </div>
  );
}
