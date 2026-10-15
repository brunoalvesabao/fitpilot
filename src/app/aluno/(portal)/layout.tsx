import { AlunoTabBar } from "./_components/aluno-tab-bar";

export default function AlunoPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <main className="pb-[calc(env(safe-area-inset-bottom)+88px)]">{children}</main>
      <AlunoTabBar />
    </div>
  );
}
