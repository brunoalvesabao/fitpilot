"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AtivarState = { error: string | null; message: string | null };

export async function ativarConvite(
  token: string,
  _prevState: AtivarState,
  formData: FormData,
): Promise<AtivarState> {
  const nome = String(formData.get("nome") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return { error: "Link de convite inválido.", message: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome, tipo: "aluno", convite_token: token } },
  });

  if (error) {
    return { error: error.message, message: null };
  }

  if (!data.session) {
    return {
      error: null,
      message: "Conta criada! Confira seu email pra confirmar, depois é só entrar.",
    };
  }

  redirect("/aluno/inicio");
}
