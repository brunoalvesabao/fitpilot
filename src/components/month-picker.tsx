"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthPicker({
  label,
  onPrev,
  onNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Mês anterior"
        className="flex size-11 items-center justify-center text-fg-muted"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <span className="min-w-[9rem] text-center text-base font-semibold">{label}</span>
      <button
        type="button"
        onClick={onNext}
        aria-label="Próximo mês"
        className="flex size-11 items-center justify-center text-fg-muted"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
