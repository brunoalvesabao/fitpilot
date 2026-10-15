import { AlunoTabBar } from "./_components/aluno-tab-bar";

export default function AlunoPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+88px)]">{children}</main>
      <AlunoTabBar />
    </div>
  );
}
