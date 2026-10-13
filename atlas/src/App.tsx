import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useStore } from './lib/store';
import { isSupabaseConfigured } from './lib/supabase';
import { MODULES, NavContext, moduleOf } from './navigation';
import type { ModuleId, ScreenId } from './types';
import { Logo } from './components/Logo';
import { SyncIndicator } from './components/SyncIndicator';
import { LoginScreen } from './components/LoginScreen';
import { cx } from './components/ui';

const HomeScreen = lazy(() => import('./modules/home/HomeScreen'));
const LancamentosScreen = lazy(() => import('./modules/finance/LancamentosScreen'));
const OrcamentoScreen = lazy(() => import('./modules/finance/OrcamentoScreen'));
const ContasScreen = lazy(() => import('./modules/finance/ContasScreen'));
const MetasScreen = lazy(() => import('./modules/finance/MetasScreen'));
const AnoScreen = lazy(() => import('./modules/finance/AnoScreen'));
const HojeScreen = lazy(() => import('./modules/focus/HojeScreen'));
const CapturaScreen = lazy(() => import('./modules/focus/CapturaScreen'));
const ProjetosScreen = lazy(() => import('./modules/focus/ProjetosScreen'));
const HabitosScreen = lazy(() => import('./modules/focus/HabitosScreen'));
const RevisaoScreen = lazy(() => import('./modules/focus/RevisaoScreen'));
const GamesModule = lazy(() => import('./modules/games/GamesModule'));
const SystemScreen = lazy(() => import('./modules/system/SystemScreen'));
const NotesScreen = lazy(() => import('./modules/system/NotesScreen'));
const ChecklistsScreen = lazy(() => import('./modules/system/ChecklistsScreen'));
const ImportScreen = lazy(() => import('./modules/system/ImportScreen'));

const SCREENS: Partial<Record<ScreenId, ComponentType>> = {
  home: HomeScreen,
  'fin-lancamentos': LancamentosScreen,
  'fin-orcamento': OrcamentoScreen,
  'fin-contas': ContasScreen,
  'fin-metas': MetasScreen,
  'fin-ano': AnoScreen,
  'focus-hoje': HojeScreen,
  'focus-captura': CapturaScreen,
  'focus-projetos': ProjetosScreen,
  'focus-habitos': HabitosScreen,
  'focus-revisao': RevisaoScreen,
  system: SystemScreen,
  'system-notes': NotesScreen,
  'system-checklists': ChecklistsScreen,
  'system-import': ImportScreen,
};

const SCREEN_KEY = 'atlas_screen';

export default function App() {
  const { session, authReady, localMode, toastMessage } = useStore();

  if (isSupabaseConfigured && !authReady) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" />
      </div>
    );
  }
  if (isSupabaseConfigured && !session && !localMode) {
    return (
      <>
        <LoginScreen />
        <Toast message={toastMessage} />
      </>
    );
  }
  return <Shell />;
}

function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-[100] card-strong !rounded-2xl px-4 py-3 flex items-center gap-3"
        >
          <CheckCircle2 size={18} className="text-brand-primary shrink-0" />
          <span className="text-sm text-text-high">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Shell() {
  const { toastMessage } = useStore();
  const [screen, setScreen] = useState<ScreenId>(() => {
    try {
      const s = localStorage.getItem(SCREEN_KEY) as ScreenId | null;
      if (s && (SCREENS[s] || s.startsWith('games-'))) return s;
    } catch {
      /* ignore */
    }
    return 'home';
  });
  const activeModule = moduleOf(screen);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [activeModule]: true });
  const [subnavOpen, setSubnavOpen] = useState(false);
  const scroller = useRef<HTMLElement>(null);

  const navigate = useCallback((s: ScreenId) => {
    setScreen(s);
    setSubnavOpen(false);
    setExpanded((e) => ({ ...e, [moduleOf(s)]: true }));
    try {
      localStorage.setItem(SCREEN_KEY, s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [screen]);

  const onBottomTap = (id: ModuleId) => {
    const mod = MODULES.find((m) => m.id === id)!;
    if (mod.screens.length === 1) {
      navigate(mod.screens[0].id);
      return;
    }
    if (activeModule === id) setSubnavOpen((o) => !o);
    else {
      navigate(mod.screens[0].id);
      setSubnavOpen(true);
    }
  };

  const Screen = SCREENS[screen];
  const currentModule = MODULES.find((m) => m.id === activeModule)!;

  return (
    <NavContext.Provider value={{ screen, navigate }}>
      <div className="h-[100dvh] w-full overflow-hidden bg-bg-base text-text-high flex flex-col md:flex-row">
        {/* ---------------- Sidebar (desktop) ---------------- */}
        <aside className="hidden md:flex flex-col w-64 bg-bg-surface-low border-r border-outline-variant/70 p-5 shrink-0 justify-between h-full overflow-y-auto custom-scrollbar select-none">
          <div className="space-y-7">
            <button type="button" onClick={() => navigate('home')} className="pb-5 border-b border-outline-variant/70 w-full text-left">
              <Logo />
            </button>
            <nav className="space-y-1.5">
              {MODULES.map((mod) => {
                const isActive = activeModule === mod.id;
                const multi = mod.screens.length > 1;
                const open = expanded[mod.id];
                return (
                  <div key={mod.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => (multi ? setExpanded((e) => ({ ...e, [mod.id]: !e[mod.id] })) : navigate(mod.screens[0].id))}
                      className={cx(
                        'w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-extrabold tracking-widest uppercase font-display transition-all border',
                        isActive && !multi
                          ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/15'
                          : isActive
                            ? 'text-text-high border-transparent'
                            : 'text-text-muted hover:text-text-high hover:bg-bg-surface-med border-transparent',
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <mod.icon size={16} className={isActive ? 'text-brand-primary' : ''} />
                        {mod.label}
                      </span>
                      {multi && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                    <AnimatePresence initial={false}>
                      {multi && open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden pl-4 space-y-0.5"
                        >
                          {mod.screens.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => navigate(s.id)}
                              className={cx(
                                'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[10px] font-extrabold tracking-widest uppercase font-display transition-all',
                                screen === s.id ? 'text-brand-primary bg-brand-primary/10' : 'text-text-muted hover:text-text-high hover:bg-bg-surface-med',
                              )}
                            >
                              <s.icon size={14} />
                              {s.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>
          </div>
          <div className="pt-4 border-t border-outline-variant/70 mt-4">
            <SyncIndicator variant="desktop" />
          </div>
        </aside>

        {/* ---------------- Conteúdo ---------------- */}
        <main ref={scroller} id="content-scroller" className="flex-1 overflow-y-auto custom-scrollbar h-full">
          <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-40 md:px-10 md:py-8 md:pb-12 max-w-6xl mx-auto">
            {/* Header mobile */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/70 md:hidden">
              <button type="button" onClick={() => navigate('home')}>
                <Logo nameClass="text-xl" />
              </button>
              <SyncIndicator variant="mobile" />
            </div>

            <Suspense
              fallback={
                <div className="py-24 flex justify-center">
                  <Loader2 className="animate-spin text-brand-primary" />
                </div>
              }
            >
              <motion.div key={screen} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                {screen.startsWith('games-') ? <GamesModule screen={screen} /> : Screen ? <Screen /> : null}
              </motion.div>
            </Suspense>
          </div>
        </main>

        {/* ---------------- Sub-navegação flutuante (mobile) ---------------- */}
        <AnimatePresence>
          {subnavOpen && currentModule.screens.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              className="fixed bottom-[88px] left-3 right-3 z-55 bg-bg-surface-low/95 backdrop-blur-md border border-outline-variant/60 px-2 py-3 rounded-2xl flex items-center justify-around md:hidden shadow-2xl"
            >
              {currentModule.screens.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(s.id)}
                  className={cx('flex flex-col items-center gap-1 px-1.5 transition-all', screen === s.id ? 'text-brand-primary scale-105' : 'text-text-muted')}
                >
                  <s.icon size={17} />
                  <span className="text-[9px] font-extrabold tracking-widest uppercase font-display">{s.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------- Barra inferior (mobile) ---------------- */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface-low/95 backdrop-blur-md border-t border-outline-variant/70 px-2 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] flex items-center justify-around md:hidden">
          {MODULES.map((mod) => {
            const active = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onBottomTap(mod.id)}
                className={cx('flex flex-col items-center gap-1 min-w-[56px] transition-all', active ? 'text-brand-primary' : 'text-text-muted')}
              >
                <mod.icon size={19} className={active ? 'scale-110 transition-transform' : 'transition-transform'} />
                <span className="text-[9px] font-extrabold tracking-widest uppercase font-display">{mod.label}</span>
              </button>
            );
          })}
        </nav>

        <Toast message={toastMessage} />
      </div>
    </NavContext.Provider>
  );
}
