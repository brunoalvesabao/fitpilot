import { createClient } from "@/lib/supabase/server";
import { CONFIG_MODULOS_PADRAO } from "@/lib/config-modulos";
import { OnboardingClient } from "./_components/onboarding-client";

export default async function OnboardingPage() {
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

  return <OnboardingClient initial={CONFIG_MODULOS_PADRAO} />;
}
