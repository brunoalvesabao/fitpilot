"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, UserCircle } from "lucide-react";

const tabs = [
  { href: "/aluno/inicio", label: "Início", icon: CalendarCheck },
  { href: "/aluno/perfil", label: "Perfil", icon: UserCircle },
];

export function AlunoTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 w-full border-t backdrop-blur-md"
      style={{
        borderTopColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(12,13,16,0.92)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="grid h-tabbar w-full grid-cols-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href} className="flex h-full">
              <Link
                href={href}
                prefetch
                className="flex h-full w-full flex-col items-center justify-center gap-1 transition-transform duration-100 active:scale-95 active:bg-white/5"
                style={{ color: isActive ? "#22C55E" : "rgba(255,255,255,0.5)" }}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-[26px]" aria-hidden />
                <span className="text-xs leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
