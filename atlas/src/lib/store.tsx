import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppData, FinanceData, FocusData, GamesData, Theme } from '../types';
import { createDefaultData, normalizeData } from './defaults';
import { DATA_TABLE, getSupabase, isSupabaseConfigured } from './supabase';

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error' | 'offline';

type Updater<T> = T | ((prev: T) => T);
const resolve = <T,>(u: Updater<T>, prev: T): T => (typeof u === 'function' ? (u as (p: T) => T)(prev) : u);

interface StoreValue {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  setFinance: (u: Updater<FinanceData>) => void;
  setFocus: (u: Updater<FocusData>) => void;
  setGames: (u: Updater<GamesData>) => void;
  replaceAll: (d: AppData) => void;

  theme: Theme;
  setTheme: (t: Theme) => void;

  session: Session | null;
  authReady: boolean;
  localMode: boolean;
  enterLocalMode: () => void;
  signOut: () => Promise<void>;

  syncStatus: SyncStatus;
  lastSynced: string | null;
  syncError: string | null;
  syncNow: () => void;

  toast: (msg: string) => void;
  toastMessage: string | null;
}

const StoreContext = createContext<StoreValue | null>(null);

const THEME_KEY = 'atlas_theme';
const LOCAL_MODE_KEY = 'atlas_local_mode';
const storageKey = (userId: string | null) => `atlas_data_v1:${userId || 'local'}`;

function loadLocal(userId: string | null): AppData {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return normalizeData(JSON.parse(raw));
    // Primeiro login: herda o que foi feito no modo local
    if (userId) {
      const local = localStorage.getItem(storageKey(null));
      if (local) return normalizeData(JSON.parse(local));
    }
  } catch (err) {
    console.warn('Falha ao ler dados locais', err);
  }
  return createDefaultData();
}

function saveLocal(userId: string | null, data: AppData) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch (err) {
    console.warn('Falha ao salvar localmente', err);
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();

  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (t === 'light' || t === 'dark') return t;
    } catch {
      /* ignore */
    }
    return 'light';
  });

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [localMode, setLocalMode] = useState<boolean>(() => {
    if (!isSupabaseConfigured) return true;
    try {
      return localStorage.getItem(LOCAL_MODE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const userId = session?.user.id ?? null;
  const [data, setData] = useState<AppData>(() => loadLocal(null));
  const dataRef = useRef(data);
  dataRef.current = data;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isSupabaseConfigured ? 'syncing' : 'offline');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const pushTimer = useRef<number | null>(null);
  const pendingPush = useRef(false);
  const loadedUser = useRef<string | null | undefined>(undefined);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const toast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2600);
  }, []);

  // ---- Tema
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f7fb' : '#050506');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // ---- Autenticação
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // ---- Envio para a nuvem
  const pushNow = useCallback(async () => {
    if (!supabase || !userId) return;
    pendingPush.current = false;
    setSyncStatus('syncing');
    const payload = dataRef.current;
    const { error } = await supabase
      .from(DATA_TABLE)
      .upsert({ user_id: userId, data: payload, updated_at: payload.updatedAt }, { onConflict: 'user_id' });
    if (error) {
      setSyncStatus('error');
      setSyncError(error.message);
      pendingPush.current = true;
    } else {
      setSyncStatus('synced');
      setSyncError(null);
      setLastSynced(new Date().toISOString());
    }
  }, [supabase, userId]);

  const schedulePush = useCallback(() => {
    if (!supabase || !userId) return;
    pendingPush.current = true;
    setSyncStatus('pending');
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => void pushNow(), 1200);
  }, [supabase, userId, pushNow]);

  // ---- Baixar da nuvem (usado no login e ao voltar para o app)
  const pull = useCallback(
    async (initial: boolean) => {
      if (!supabase || !userId) return;
      if (!initial && pendingPush.current) return;
      setSyncStatus('syncing');
      const { data: row, error } = await supabase
        .from(DATA_TABLE)
        .select('data, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        setSyncStatus('error');
        setSyncError(error.message);
        return;
      }
      const local = dataRef.current;
      if (!row) {
        await pushNow();
        return;
      }
      const remote = normalizeData(row.data);
      const remoteTime = new Date(remote.updatedAt || row.updated_at || 0).getTime();
      const localTime = new Date(local.updatedAt).getTime();
      if (remoteTime >= localTime) {
        setData(remote);
        saveLocal(userId, remote);
        setSyncStatus('synced');
        setSyncError(null);
        setLastSynced(new Date().toISOString());
      } else {
        await pushNow();
      }
    },
    [supabase, userId, pushNow],
  );

  // Ao trocar de usuário: carrega os dados locais desse usuário e sincroniza
  useEffect(() => {
    if (!authReady) return;
    if (loadedUser.current === userId) return;
    loadedUser.current = userId;
    const local = loadLocal(userId);
    dataRef.current = local;
    setData(local);
    if (userId) void pull(true);
    else setSyncStatus('offline');
  }, [authReady, userId, pull]);

  // Ao voltar para a aba/app, busca alterações feitas em outro aparelho
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pull(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [userId, pull]);

  // Salva antes de fechar
  useEffect(() => {
    const flush = () => {
      if (pendingPush.current) void pushNow();
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [pushNow]);

  const update = useCallback(
    (fn: (d: AppData) => AppData) => {
      setData((prev) => {
        const next = { ...fn(prev), updatedAt: new Date().toISOString() };
        saveLocal(userId, next);
        return next;
      });
      schedulePush();
    },
    [userId, schedulePush],
  );

  const setFinance = useCallback((u: Updater<FinanceData>) => update((d) => ({ ...d, finance: resolve(u, d.finance) })), [update]);
  const setFocus = useCallback((u: Updater<FocusData>) => update((d) => ({ ...d, focus: resolve(u, d.focus) })), [update]);
  const setGames = useCallback((u: Updater<GamesData>) => update((d) => ({ ...d, games: resolve(u, d.games) })), [update]);
  const replaceAll = useCallback((d: AppData) => update(() => normalizeData(d)), [update]);

  const enterLocalMode = useCallback(() => {
    setLocalMode(true);
    try {
      localStorage.setItem(LOCAL_MODE_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const signOut = useCallback(async () => {
    if (pendingPush.current) await pushNow();
    await supabase?.auth.signOut();
    setLocalMode(false);
    try {
      localStorage.removeItem(LOCAL_MODE_KEY);
    } catch {
      /* ignore */
    }
  }, [supabase, pushNow]);

  const syncNow = useCallback(() => {
    if (!userId) {
      toast(isSupabaseConfigured ? 'Entre na sua conta para sincronizar.' : 'Modo local: dados salvos neste aparelho.');
      return;
    }
    if (pendingPush.current) void pushNow();
    else void pull(false);
  }, [userId, pushNow, pull, toast]);

  const value = useMemo<StoreValue>(
    () => ({
      data,
      update,
      setFinance,
      setFocus,
      setGames,
      replaceAll,
      theme,
      setTheme: setThemeState,
      session,
      authReady,
      localMode,
      enterLocalMode,
      signOut,
      syncStatus,
      lastSynced,
      syncError,
      syncNow,
      toast,
      toastMessage,
    }),
    [data, update, setFinance, setFocus, setGames, replaceAll, theme, session, authReady, localMode, enterLocalMode, signOut, syncStatus, lastSynced, syncError, syncNow, toast, toastMessage],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>');
  return ctx;
}
