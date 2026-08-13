import { BottomTabBar } from "@/components/bottom-tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex-1 pb-[calc(var(--size-tabbar)+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
