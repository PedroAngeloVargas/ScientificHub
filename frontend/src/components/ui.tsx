import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

// Marca do produto: dois nós ligados (o grafo de interesses) + nome
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
        <line x1="7" y1="20" x2="21" y2="8" className="stroke-accent" strokeWidth="2" strokeLinecap="round" />
        <circle cx="7" cy="20" r="4.5" className="fill-accent" />
        <circle cx="21" cy="8" r="4.5" className={inverted ? 'fill-white' : 'fill-highlight'} stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className={cx('text-lg font-bold tracking-tight', inverted ? 'text-white' : 'text-ink')}>
        ScientificHub
      </span>
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'bg-surface text-ink border border-line hover:border-accent hover:text-accent',
  ghost: 'text-muted hover:text-ink hover:bg-accent-soft',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer',
        buttonVariants[variant],
        className
      )}
      {...props}
    />
  );
}

const fieldBase =
  'block w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[15px] text-text placeholder:text-muted/70 ' +
  'transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink">
        {label}
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(fieldBase, 'resize-y leading-relaxed', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(fieldBase, 'cursor-pointer appearance-none bg-size-[16px] bg-position-[right_0.75rem_center] bg-no-repeat pr-10', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235c6270' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props} />;
}

type AlertTone = 'error' | 'info' | 'success';

// Recado na margem: barra lateral colorida, como uma anotação de caneta
const alertTones: Record<AlertTone, string> = {
  error: 'bg-danger-soft text-danger border-danger',
  info: 'bg-accent-soft text-accent-strong border-accent',
  success: 'bg-success-soft text-success border-success',
};

export function Alert({ tone, children }: { tone: AlertTone; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-r-md border-l-[3px] px-4 py-2.5 text-sm font-medium', alertTones[tone])}>
      {children}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-lg border border-line bg-surface', className)}>{children}</div>;
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center rounded-sm px-1.5 py-px text-xs font-semibold', className ?? 'bg-accent-soft text-accent-strong')}>
      {children}
    </span>
  );
}

// Título de secção; "eyebrow" vira uma linha de apoio por baixo, em vez de rótulo em maiúsculas por cima
export function SectionHeading({ eyebrow, title, aside }: { eyebrow?: string; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3">
      <div>
        <h2 className="text-[1.375rem] font-bold leading-tight text-ink">{title}</h2>
        {eyebrow && <p className="mt-0.5 text-sm text-muted">{eyebrow}</p>}
      </div>
      {aside}
    </div>
  );
}

export function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />;
}
