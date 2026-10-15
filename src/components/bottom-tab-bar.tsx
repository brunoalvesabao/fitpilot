"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Users, Wallet, MoreHorizontal } from "lucide-react";

const allTabs = [
  { href: "/app/hoje", label: "Hoje", icon: CalendarCheck },
  { href: "/app/alunos", label: "Alunos", icon: Users },
  { href: "/app/financeiro", label: "Financeiro", icon: Wallet, requer: "financeiro" as const },
  { href: "/app/mais", label: "Mais", icon: MoreHorizontal },
];

export function BottomTabBar({ mostrarFinanceiro = true }: { mostrarFinanceiro?: boolean }) {
  const pathname = usePathname();
  const tabs = allTabs.filter((tab) => tab.requer !== "financeiro" || mostrarFinanceiro);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 w-full border-t backdrop-blur-md"
      style={{
        borderTopColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(12,13,16,0.92)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul
        className="grid h-tabbar w-full"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
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
