"use client";

import { useRouter } from "next/navigation";
import { ModulosConfigForm } from "../../mais/modulos/_components/modulos-config-form";
import type { ConfigModulosValores } from "@/lib/config-modulos";

export function OnboardingClient({ initial }: { initial: ConfigModulosValores }) {
  const router = useRouter();

  return (
    <ModulosConfigForm
      initial={initial}
      onSalvar="onboarding"
      aoConcluir={() => router.push("/app/hoje")}
    />
  );
}
