import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ConfigModulosValores = {
  modulo_financeiro: boolean;
  modulo_reposicao: boolean;
  modulo_avaliacao: boolean;
};

export const CONFIG_MODULOS_PADRAO: ConfigModulosValores = {
  modulo_financeiro: true,
  modulo_reposicao: true,
  modulo_avaliacao: false,
};

/**
 * NOTA: o schema de config_modulos (tabela com id + profissional_id, em vez
 * de profissional_id como chave primária direta como em config_reposicao)
 * nunca foi confirmado pelo usuário como as demais tabelas deste projeto —
 * é a melhor suposição a partir do types/database.ts existente. Se os nomes
 * reais das colunas forem diferentes, isto falha silenciosamente e todo
 * profissional cai nos valores padrão (módulo_financeiro e reposição
 * ligados, avaliação desligada).
 */
export async function getConfigModulos(
  supabase: SupabaseClient<Database>,
  profissionalId: string,
): Promise<ConfigModulosValores & { configurado: boolean }> {
  const { data } = await supabase
    .from("config_modulos")
    .select("modulo_financeiro, modulo_reposicao, modulo_avaliacao")
    .eq("profissional_id", profissionalId)
    .maybeSingle();

  if (!data) {
    return { ...CONFIG_MODULOS_PADRAO, configurado: false };
  }

  return { ...data, configurado: true };
}
