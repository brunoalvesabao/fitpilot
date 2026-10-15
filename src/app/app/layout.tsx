import { BottomTabBar } from "@/components/bottom-tab-bar";
import { createClient } from "@/lib/supabase/server";
import { getConfigModulos } from "@/lib/config-modulos";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
