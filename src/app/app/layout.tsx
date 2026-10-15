import { redirect } from "next/navigation";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { createClient } from "@/lib/supabase/server";
import { getConfigModulos } from "@/lib/config-modulos";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Toda conta de profissional tem uma linha em "profissional" (criada no
    // cadastro). Quem não tem é uma conta de aluno — essa área não é pra
    // ela, mesmo que esteja autenticada (ex.: foi em /login por engano
    // enquanto já estava logada como aluno em outra aba).
    const { data: profissional } = await supabase
      .from("profissional")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profissional) {
      redirect("/aluno/inicio");
    }
  }

  const configModulos = user ? await getConfigModulos(supabase, user.id) : null;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+88px)]">
        {children}
      </main>
      <BottomTabBar mostrarFinanceiro={configModulos?.modulo_financeiro ?? true} />
    </div>
  );
}
