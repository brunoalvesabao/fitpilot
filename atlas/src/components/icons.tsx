import type { SVGProps } from 'react';

/** Ícone de Pokébola no mesmo "traço" dos ícones lucide. */
export function PokeballIcon({ size = 24, strokeWidth = 2, className, ...rest }: SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h7" />
      <path d="M15 12h7" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
