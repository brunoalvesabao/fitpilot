import { AlertTriangle, CheckCircle2, CloudOff, HardDrive, RefreshCw } from 'lucide-react';
import { useStore } from '../lib/store';
import { cx } from './ui';

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--');

export function SyncIndicator({ variant }: { variant: 'mobile' | 'desktop' }) {
  const { syncStatus, lastSynced, syncError, syncNow, session, toast } = useStore();
  const local = !session;
  const status = local ? 'local' : syncStatus;

  const meta = {
    synced: { label: 'Sincronizado', icon: CheckCircle2, cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' },
    syncing: { label: 'Sincronizando', icon: RefreshCw, cls: 'bg-sky-500/10 border-sky-500/30 text-sky-600' },
    pending: { label: 'Salvando…', icon: RefreshCw, cls: 'bg-amber-500/10 border-amber-500/30 text-amber-600' },
    error: { label: 'Erro de sync', icon: AlertTriangle, cls: 'bg-rose-500/10 border-rose-500/30 text-rose-600' },
    offline: { label: 'Offline', icon: CloudOff, cls: 'bg-zinc-500/10 border-zinc-500/30 text-text-muted' },
    local: { label: 'Local', icon: HardDrive, cls: 'bg-zinc-500/10 border-zinc-500/25 text-text-muted' },
  }[status];
  const Icon = meta.icon;
  const spinning = status === 'syncing' || status === 'pending';

  const onClick = () => {
    if (status === 'error' && syncError) toast(`Erro: ${syncError}`);
    syncNow();
  };

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx('px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-display text-[10px] font-extrabold uppercase tracking-widest active:scale-95 transition-all', meta.cls)}
      >
        <Icon size={13} className={spinning ? 'animate-spin' : ''} />
        {meta.label}
      </button>
    );
  }

  return (
    <div className={cx('rounded-2xl border p-3 flex items-center gap-3', meta.cls)}>
      <div className="w-9 h-9 rounded-xl bg-current/10 flex items-center justify-center shrink-0 relative">
        <Icon size={17} className={spinning ? 'animate-spin' : ''} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[11px] font-extrabold uppercase tracking-wider text-text-high">{meta.label}</p>
        <p className="text-[11px] text-text-muted truncate">
          {local ? 'Salvo neste aparelho' : status === 'error' ? syncError : `Salvo às ${time(lastSynced)}`}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        title="Sincronizar agora"
        className="w-8 h-8 rounded-lg border border-outline-variant/40 bg-bg-surface-low flex items-center justify-center text-text-mid hover:text-text-high"
      >
        <RefreshCw size={13} />
      </button>
    </div>
  );
}
