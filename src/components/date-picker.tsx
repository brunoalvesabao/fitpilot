"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function DatePicker({
  value,
  label,
  onChange,
  onPrev,
  onNext,
}: {
  value: string; // "YYYY-MM-DD"
  label: string;
  onChange: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Dia anterior"
        className="flex size-11 shrink-0 items-center justify-center text-fg-muted"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>

      <div className="relative flex h-touch flex-1 items-center justify-center">
        <span className="text-sm font-medium">{label}</span>
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Selecionar data"
        />
      </div>

      <button
        type="button"
        onClick={onNext}
        aria-label="Próximo dia"
        className="flex size-11 shrink-0 items-center justify-center text-fg-muted"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
