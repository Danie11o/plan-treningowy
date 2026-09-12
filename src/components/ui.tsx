import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { create } from 'zustand';
import { currentEntry, pushOverlayEntry } from '../lib/router';
import type { DayKey, Tag } from '../lib/types';
import { IconCheck, IconChevronLeft, IconMinus, IconPlus, IconTrophy, IconX } from './icons';

/* ── Przycisk ──────────────────────────────────────────────────────────────
   `lg` to główna akcja na siłowni: 56 px, trafiasz spoconym kciukiem. */

type Variant = 'day' | 'solid' | 'ghost' | 'outline' | 'danger' | 'stop';

const VARIANT: Record<Variant, string> = {
  day: 'bg-day text-day-ink font-semibold active:brightness-95',
  solid: 'bg-raised text-chalk active:bg-edge',
  ghost: 'text-ash active:bg-panel active:text-chalk',
  outline: 'border border-edge text-chalk active:bg-panel',
  danger: 'border border-stop/40 text-stop active:bg-stop/10',
  stop: 'bg-stop text-white font-semibold active:brightness-95',
};

const SIZE = {
  lg: 'h-14 px-6 text-[16px] rounded-2xl',
  md: 'h-12 px-4 text-[15px] rounded-xl',
  sm: 'h-10 px-3 text-[14px] rounded-xl',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof SIZE;
  full?: boolean;
};

export function Button({
  variant = 'solid',
  size = 'md',
  full,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={`inline-flex items-center justify-center gap-2 transition-[background-color,color,filter,transform] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${full ? 'w-full' : ''} ${className}`}
    />
  );
}

/* ── Systemowe „wstecz" zamyka arkusz ──────────────────────────────────────
   Na Androidzie gest wstecz przy otwartym arkuszu ma zamknąć arkusz, a nie
   wyrzucić z ekranu treningu. */

export function useBackClose(open: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const mine = pushOverlayEntry();
    let poppedByBack = false;
    const onPop = () => {
      if (currentEntry() < mine) {
        poppedByBack = true;
        closeRef.current();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!poppedByBack && history.state?.overlay === mine) history.back();
    };
  }, [open]);
}

/* ── Arkusz dolny ──────────────────────────────────────────────────────────
   Decyzje w trakcie treningu wjeżdżają od dołu, w zasięgu kciuka. */

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    setLeaving(true);
    const id = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, 200);
    return () => window.clearTimeout(id);
  }, [open]);

  useBackClose(open, onClose);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ pointerEvents: open ? 'auto' : 'none' }}
    >
      <button
        type="button"
        aria-label="Zamknij"
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] ${
          leaving ? 'opacity-0 transition-opacity duration-200' : 'animate-fade'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative mx-auto max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-[26px] border-t border-edge bg-panel pb-safe ${
          leaving ? 'translate-y-full transition-transform duration-200 ease-in' : 'animate-sheet'
        }`}
      >
        <div className="sticky top-0 z-10 bg-panel/95 px-5 pt-3 pb-3 backdrop-blur">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge" />
          {title && (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="display text-[26px] uppercase">{title}</h2>
                {subtitle && <p className="mt-1 text-[14px] text-ash">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Zamknij"
                className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ash active:bg-raised"
              >
                <IconX className="size-5" />
              </button>
            </div>
          )}
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

/** Pytanie przed nieodwracalną akcją. */
export function Confirm({
  open,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="text-[15px] leading-relaxed text-ash">{message}</div>
      <div className="mt-5 grid gap-2">
        <Button variant={danger ? 'stop' : 'day'} size="lg" full onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="ghost" size="md" full onClick={onClose}>
          Anuluj
        </Button>
      </div>
    </Sheet>
  );
}

/* ── Komunikat u góry ekranu ───────────────────────────────────────────── */

type ToastKind = 'pr' | 'ok' | 'info';

export const useToast = create<{ toast: { id: number; kind: ToastKind; text: string } | null }>(
  () => ({ toast: null }),
);

let hideTimer = 0;

export function showToast(kind: ToastKind, text: string): void {
  window.clearTimeout(hideTimer);
  useToast.setState({ toast: { id: Date.now(), kind, text } });
  hideTimer = window.setTimeout(() => useToast.setState({ toast: null }), 2800);
}

export function ToastHost() {
  const toast = useToast((s) => s.toast);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4"
    >
      {toast && (
        <div
          key={toast.id}
          className={`animate-toast mt-2 flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold shadow-xl shadow-black/40 ${
            toast.kind === 'pr'
              ? 'bg-gold text-[#2a1d00]'
              : toast.kind === 'ok'
                ? 'bg-go text-[#03220f]'
                : 'bg-raised text-chalk'
          }`}
        >
          {toast.kind === 'pr' && <IconTrophy className="size-[18px]" />}
          {toast.kind === 'ok' && <IconCheck className="size-[18px]" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ── Drobne elementy ───────────────────────────────────────────────────── */

/** Litera treningu w jego kolorze. */
export function DayBadge({ day, size = 'md' }: { day: DayKey; size?: 'sm' | 'md' | 'lg' }) {
  const s = {
    sm: 'size-7 text-[17px] rounded-lg',
    md: 'size-9 text-[22px] rounded-[10px]',
    lg: 'size-12 text-[30px] rounded-xl',
  }[size];
  return (
    <span
      data-day={day}
      className={`display grid shrink-0 place-items-center bg-day pt-[0.06em] text-day-ink ${s}`}
    >
      {day}
    </span>
  );
}

/**
 * Serie jako kreski: pełna — seria z planu, przerywana — opcjonalna
 * („2–3 serie"), w kolorze dnia — już zrobiona.
 */
export function Pips({
  min,
  max,
  done = 0,
  className = '',
}: {
  min: number;
  max: number;
  done?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden="true">
      {Array.from({ length: Math.max(max, done) }, (_, i) => (
        <span
          key={i}
          className={`h-[7px] w-[18px] rounded-full ${
            i < done
              ? 'bg-day'
              : i < min
                ? 'bg-chalk/75'
                : 'border border-dashed border-chalk/55'
          }`}
        />
      ))}
    </span>
  );
}

export function TagChip({ tag }: { tag: Tag }) {
  return (
    <span className="label rounded-md border border-edge px-1.5 py-[5px] text-[10px] text-ash">
      {tag}
    </span>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="display text-[24px] uppercase text-chalk">{children}</h2>
      {aside && <span className="text-right text-[13px] text-ash">{aside}</span>}
    </div>
  );
}

export function ScreenTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: ReactNode;
  title: string;
  right?: ReactNode;
}) {
  return (
    <header className="pt-safe px-4 pb-5">
      <div className="flex items-end justify-between gap-3 pt-4">
        <div className="min-w-0">
          {eyebrow && <p className="label text-ash">{eyebrow}</p>}
          <h1 className="display mt-2 text-[46px] uppercase leading-[0.85]">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}

/** Pasek z przyciskiem wstecz dla ekranów szczegółów. */
export function BackBar({
  title,
  onBack,
  right,
}: {
  title: ReactNode;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-edge/70 bg-night/90 px-2 pb-2 backdrop-blur-xl">
      <div className="flex min-h-11 items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Wróć"
          className="grid size-11 shrink-0 place-items-center rounded-full text-ash active:bg-panel"
        >
          <IconChevronLeft className="size-6" />
        </button>
        <div className="display min-w-0 flex-1 truncate text-[22px] uppercase">{title}</div>
        {right}
      </div>
    </header>
  );
}

/** Licznik − 4 + do planu. Duże przyciski, bez klawiatury. */
export function Stepper({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-edge bg-night p-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`${label}: mniej`}
        className="grid size-11 place-items-center rounded-lg text-ash active:bg-raised active:text-chalk disabled:opacity-30"
      >
        <IconMinus className="size-5" />
      </button>
      <span className="num min-w-9 text-center text-[26px] text-chalk" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`${label}: więcej`}
        className="grid size-11 place-items-center rounded-lg text-ash active:bg-raised active:text-chalk disabled:opacity-30"
      >
        <IconPlus className="size-5" />
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-edge px-5 py-10 text-center">
      <p className="text-[16px] font-semibold text-chalk">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-[34ch] text-[14px] leading-relaxed text-ash">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
