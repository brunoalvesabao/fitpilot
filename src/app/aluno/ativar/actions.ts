"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AtivarState = { error: string | null };

export async function ativarConvite(
  token: string,
  _prevState: AtivarState,
  formData: FormData,
): Promise<AtivarState> {
  const nome = String(formData.get("nome") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return { error: "Link de convite inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome, tipo: "aluno", convite_token: token } },
  });

  if (error) {
    return { error: error.message };
  }

  // Importante: sempre redirecionar em vez de devolver um estado de
  // sucesso pra essa mesma página. O convite já foi consumido neste
  // ponto (o gatilho de criação do usuário já rodou), então, se
  // ficássemos aqui, o Server Component desta rota revalidaria e veria
  // o token como inválido — mostrando "Link inválido" por cima da
  // mensagem de sucesso que deveria aparecer.
  if (!data.session) {
    redirect("/aluno/login?criado=1");
  }

  redirect("/aluno/inicio");
}
