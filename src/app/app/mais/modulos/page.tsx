import { createClient } from "@/lib/supabase/server";
import { getConfigModulos } from "@/lib/config-modulos";
import { ModulosConfigForm } from "./_components/modulos-config-form";

export default async function ModulosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-red">
          Não foi possível identificar sua sessão. Faça login novamente.
        </p>
      </div>
    );
  }

  const config = await getConfigModulos(supabase, user.id);

  return (
    <ModulosConfigForm
      initial={{
        modulo_financeiro: config.modulo_financeiro,
        modulo_reposicao: config.modulo_reposicao,
        modulo_avaliacao: config.modulo_avaliacao,
      }}
      onSalvar="mais"
    />
  );
}
