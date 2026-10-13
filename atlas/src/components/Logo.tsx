import { APP_NAME } from '../config';

export function Logo({ size = 40, withName = true, nameClass = 'text-lg' }: { size?: number; withName?: boolean; nameClass?: string }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/atlas.svg" alt={APP_NAME} width={size} height={size} className="rounded-xl shadow-md" style={{ width: size, height: size }} />
      {withName && <span className={`font-display font-extrabold tracking-[0.12em] uppercase text-text-high ${nameClass}`}>{APP_NAME}</span>}
    </div>
  );
}
