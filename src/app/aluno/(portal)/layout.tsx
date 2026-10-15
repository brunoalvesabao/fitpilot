import { AlunoTabBar } from "./_components/aluno-tab-bar";

export default function AlunoPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AlunoTabBar />
    </div>
  );
}
