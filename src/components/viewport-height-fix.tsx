"use client";

import { useEffect } from "react";

/**
 * O iOS, no modo standalone, às vezes reporta 100dvh maior do que a
 * viewport "assentada" final no primeiro carregamento, corrigindo só
 * depois de um resize/gesto de rolagem — isso cria aquele espaço vazio
 * (ou bounce) embaixo de telas com um shell de altura fixa. Medindo
 * window.innerHeight direto em JS (em vez de confiar na unidade CSS)
 * e guardando num custom property, o layout sempre bate com a altura
 * real, atualizado a cada resize/orientação.
 */
export function ViewportHeightFix() {
  useEffect(() => {
    function set() {
      document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
    }
    set();
    window.addEventListener("resize", set);
    window.addEventListener("orientationchange", set);
    return () => {
      window.removeEventListener("resize", set);
      window.removeEventListener("orientationchange", set);
    };
  }, []);

  return null;
}
