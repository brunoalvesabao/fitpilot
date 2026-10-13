import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { HardDrive, Loader2 } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { APP_NAME } from '../config';

export function LoginScreen() {
  const { enterLocalMode } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMsg({ type: 'error', text: error.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : error.message });
    else if (mode === 'signup') setMsg({ type: 'ok', text: 'Conta criada! Se o Supabase pedir confirmação, confira seu e-mail.' });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-bg-base relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full brand-gradient opacity-[0.12] blur-3xl" />
      <div className="absolute -bottom-48 -left-40 w-[420px] h-[420px] rounded-full bg-sky-500 opacity-[0.07] blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-strong w-full max-w-sm p-7 relative">
        <div className="flex flex-col items-center text-center mb-7">
          <img src="/atlas.svg" alt="" className="w-16 h-16 rounded-2xl shadow-lg mb-4" />
          <h1 className="font-display font-extrabold text-2xl tracking-[0.14em] uppercase">{APP_NAME}</h1>
          <p className="text-sm text-text-muted mt-1">Finanças, foco e jogos — tudo seu, num lugar só.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="label">E-mail</span>
            <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Senha</span>
            <input
              className="field"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {msg && <p className={`text-xs ${msg.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>{msg.text}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand-primary hover:bg-brand-primary-hover text-brand-ink font-display font-extrabold uppercase tracking-widest text-[11px] py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <div className="mt-5 flex flex-col items-center gap-3">
          <button type="button" className="text-xs text-text-muted hover:text-text-high" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tenho conta'}
          </button>
          <button type="button" onClick={enterLocalMode} className="text-[11px] text-text-muted hover:text-brand-primary flex items-center gap-1.5">
            <HardDrive size={12} /> Usar só neste aparelho (sem nuvem)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
