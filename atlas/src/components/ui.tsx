import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X, type LucideIcon } from 'lucide-react';
import { addMonths, monthLabel } from '../lib/dates';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

// ------------------------------------------------------------------
// Cabeçalho de página — mesmo estilo do Nocturne (ícone + título grande)
// ------------------------------------------------------------------
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 pb-6 border-b border-outline-variant/70 md:border-outline-variant/30">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
            <Icon size={24} className="text-brand-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold uppercase tracking-wider text-[26px] md:text-3xl leading-none text-text-high truncate">
              {title}
            </h1>
            {subtitle && <div className="text-sm text-text-muted mt-1.5">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
        <h2 className="font-display text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-high">{children}</h2>
      </div>
      {right}
    </div>
  );
}

export function Card({ children, className, strong, onClick }: { children: ReactNode; className?: string; strong?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx(strong ? 'card-strong' : 'card', 'p-5 md:p-6 min-w-0', className)}>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------
// Botões
// ------------------------------------------------------------------
type BtnVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'soft';
export function Button({
  children,
  onClick,
  variant = 'primary',
  icon: Icon,
  className,
  type = 'button',
  disabled,
  size = 'md',
  title,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  icon?: LucideIcon;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  size?: 'sm' | 'md';
  title?: string;
}) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-brand-primary text-brand-ink hover:bg-brand-primary-hover shadow-sm shadow-brand-primary/20',
    ghost: 'text-text-mid hover:text-text-high hover:bg-bg-surface-med',
    outline: 'border border-outline-variant/60 text-text-high hover:bg-bg-surface-med bg-bg-surface-low',
    danger: 'bg-rose-500/10 text-rose-500 border border-rose-500/25 hover:bg-rose-500/15',
    soft: 'bg-brand-primary/10 text-brand-primary border border-brand-primary/15 hover:bg-brand-primary/15',
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-display font-extrabold uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' ? 'text-[10px] px-3 py-2' : 'text-[11px] px-4 py-2.5',
        styles[variant],
        className,
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 13 : 15} strokeWidth={2.5} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, onClick, title, className, active }: { icon: LucideIcon; onClick?: () => void; title?: string; className?: string; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cx(
        'w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95',
        active ? 'bg-brand-primary/15 text-brand-primary' : 'text-text-muted hover:text-text-high hover:bg-bg-surface-med',
        className,
      )}
    >
      <Icon size={16} />
    </button>
  );
}

// ------------------------------------------------------------------
// Modal: bottom sheet no celular, diálogo centralizado no desktop
// ------------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end md:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className={cx(
              'relative w-full bg-bg-surface-low border border-outline-variant/30 shadow-2xl flex flex-col max-h-[92dvh]',
              'rounded-t-[28px] md:rounded-[28px]',
              wide ? 'md:max-w-2xl' : 'md:max-w-lg',
            )}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="font-display font-extrabold uppercase tracking-wider text-sm text-text-high">{title}</h3>
              <IconButton icon={X} onClick={onClose} title="Fechar" />
            </div>
            <div className="px-5 pb-5 overflow-y-auto custom-scrollbar flex-1">{children}</div>
            {footer && <div className="px-5 py-4 border-t border-outline-variant/15 flex gap-2 justify-end safe-bottom">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-mid leading-relaxed">{message}</p>
    </Modal>
  );
}

// ------------------------------------------------------------------
// Pequenos componentes
// ------------------------------------------------------------------
export function ProgressBar({ value, color, className, over }: { value: number; color?: string; className?: string; over?: boolean }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div className={cx('h-2 rounded-full bg-bg-surface-high overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${v * 100}%`, background: over ? '#ef4444' : color || 'linear-gradient(90deg, #ffcf4a, #f08a0c)' }}
      />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = 'var(--brand-primary)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-surface-high)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="inline-flex items-center gap-1 bg-bg-surface-low border border-outline-variant/40 rounded-2xl p-1">
      <IconButton icon={ChevronLeft} onClick={() => onChange(addMonths(month, -1))} title="Mês anterior" />
      <span className="font-display font-extrabold uppercase tracking-wider text-[11px] min-w-[118px] text-center text-text-high">
        {monthLabel(month)}
      </span>
      <IconButton icon={ChevronRight} onClick={() => onChange(addMonths(month, 1))} title="Próximo mês" />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: LucideIcon }[]; className?: string }) {
  return (
    <div className={cx('inline-flex bg-bg-surface-med border border-outline-variant/15 rounded-2xl p-1 gap-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-display font-extrabold uppercase tracking-wider transition-all',
            value === o.value ? 'bg-bg-surface-low text-brand-primary shadow-sm' : 'text-text-muted hover:text-text-high',
          )}
        >
          {o.icon && <o.icon size={13} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-14 h-14 rounded-2xl bg-bg-surface-med flex items-center justify-center mb-4">
        <Icon size={22} className="text-text-muted" />
      </div>
      <p className="font-display font-extrabold uppercase tracking-wider text-xs text-text-high">{title}</p>
      {text && <p className="text-sm text-text-muted mt-1.5 max-w-xs">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Stat({ label, value, tone, sub }: { label: string; value: ReactNode; tone?: 'pos' | 'neg' | 'brand'; sub?: ReactNode }) {
  return (
    <div className="tile p-4 min-w-0">
      <p className="label !mb-1">{label}</p>
      <p
        className={cx(
          'money text-lg md:text-xl font-semibold truncate',
          tone === 'pos' && 'text-emerald-500',
          tone === 'neg' && 'text-rose-500',
          tone === 'brand' && 'text-brand-primary',
          !tone && 'text-text-high',
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export function Fab({ onClick, icon: Icon, label }: { onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="fixed right-5 bottom-[104px] md:bottom-8 md:right-8 z-40 w-16 h-16 rounded-full bg-brand-primary text-brand-ink flex items-center justify-center shadow-xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-transform border-2 border-black/10"
    >
      <Icon size={28} strokeWidth={2.6} />
    </button>
  );
}

export function Chip({ active, onClick, children, color }: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap',
        active ? 'bg-brand-primary text-brand-ink border-brand-primary' : 'bg-bg-surface-low text-text-mid border-outline-variant/25 hover:border-outline-variant/50',
      )}
      style={active && color ? { background: color, borderColor: color, color: '#fff' } : undefined}
    >
      {children}
    </button>
  );
}
