import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConfigModulos } from "@/lib/config-modulos";
import { ReposicaoConfigForm } from "./_components/reposicao-config-form";

export default async function ConfigReposicaoPage() {
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

  const configModulos = await getConfigModulos(supabase, user.id);
  if (!configModulos.modulo_reposicao) {
    redirect("/app/mais");
  }

  const { data: config } = await supabase
    .from("config_reposicao")
    .select("permitir, antecedencia_horas, expira_mes_seguinte")
    .eq("profissional_id", user.id)
    .maybeSingle();

  return (
    <ReposicaoConfigForm
      initial={{
        permitir: config?.permitir ?? true,
        antecedencia_horas: config?.antecedencia_horas ?? 12,
        expira_mes_seguinte: config?.expira_mes_seguinte ?? true,
      }}
    />
  );
}
