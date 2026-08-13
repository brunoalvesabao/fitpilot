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
      <ul className="mx-auto flex h-tabbar max-w-md items-stretch justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                prefetch
                className={`flex min-h-[48px] w-full flex-1 flex-col items-center justify-center gap-0.5 transition-transform duration-100 active:scale-95 active:bg-white/5 ${
                  isActive ? "text-primary" : "text-fg-muted"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-6" aria-hidden />
                <span className="text-[11px] leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
