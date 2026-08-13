"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Users, Wallet, MoreHorizontal } from "lucide-react";

const tabs = [
  { href: "/app/hoje", label: "Hoje", icon: CalendarCheck },
  { href: "/app/alunos", label: "Alunos", icon: Users },
  { href: "/app/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/app/mais", label: "Mais", icon: MoreHorizontal },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 min-h-tabbar border-t border-border bg-surface/80 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-tabbar max-w-md grid-cols-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href} className="flex min-h-[56px]">
              <Link
                href={href}
                prefetch
                className={`flex w-full flex-1 flex-col items-center justify-center gap-1 transition-transform duration-100 active:scale-95 active:bg-white/5 ${
                  isActive ? "text-primary" : "text-fg-muted"
                }`}
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
