import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500";

const BUTTON_VARIANTS = {
  primary: "bg-accent-500 text-ink-950 hover:bg-accent-400",
  outline: "border border-ink-600 text-mist-100 hover:border-mist-500 hover:bg-ink-800",
  ghost: "text-mist-300 hover:bg-ink-800 hover:text-mist-100",
  danger: "bg-bear-500 text-white hover:bg-bear-500/85",
  buy: "bg-bull-500 text-ink-950 hover:bg-accent-400",
  sell: "bg-bear-500 text-white hover:bg-bear-500/85",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

export function buttonClass(
  variant: keyof typeof BUTTON_VARIANTS = "primary",
  size: keyof typeof BUTTON_SIZES = "md",
  extra?: string,
) {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={cx("rounded-xl border border-ink-700 bg-ink-900", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-ink-700 px-4 py-3">
          {typeof title === "string" ? (
            <h2 className="text-sm font-semibold tracking-wide text-mist-300 uppercase">{title}</h2>
          ) : (
            title
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-mist-300">{label}</span>
      <input
        className={cx(
          "h-10 w-full rounded-lg border bg-ink-850 px-3 text-sm text-mist-100 placeholder:text-mist-500 focus:outline-none focus:ring-2 focus:ring-accent-500/60",
          error ? "border-bear-500" : "border-ink-600",
          className,
        )}
        {...props}
      />
      {hint && !error && <span className="mt-1 block text-xs text-mist-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-bear-500">{error}</span>}
    </label>
  );
}

export function SelectField({
  label,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-mist-300">{label}</span>
      <select
        className={cx(
          "h-10 w-full rounded-lg border border-ink-600 bg-ink-850 px-3 text-sm text-mist-100 focus:outline-none focus:ring-2 focus:ring-accent-500/60",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-bear-500/40 bg-bear-500/10 text-bear-500",
    success: "border-accent-500/40 bg-accent-500/10 text-accent-400",
    info: "border-ink-600 bg-ink-800 text-mist-300",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("rounded-lg border px-3 py-2 text-sm", styles)}>
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "bad" | "warn"; children: ReactNode }) {
  const styles = {
    neutral: "border-ink-600 bg-ink-800 text-mist-300",
    good: "border-accent-500/40 bg-accent-500/10 text-accent-400",
    bad: "border-bear-500/40 bg-bear-500/10 text-bear-500",
    warn: "border-warn-500/40 bg-warn-500/10 text-warn-500",
  }[tone];
  // inline-flex, not the paragraph-safe block variants - keep this on short labels.
  return <span className={cx("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", styles)}>{children}</span>;
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5">
      <div className="text-[11px] font-medium tracking-wide text-mist-500 uppercase">{label}</div>
      <div
        className={cx(
          "tabular mt-0.5 text-lg font-semibold",
          tone === "good" && "text-accent-400",
          tone === "bad" && "text-bear-500",
          !tone && "text-mist-100",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-mist-300">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-mist-500">{body}</p>}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 28 28" aria-hidden="true" className="h-7 w-7">
        <rect width="28" height="28" rx="8" fill="#0e152a" stroke="#24325c" />
        <path d="M6 19.5 L11 12 L15 16 L22 7.5" fill="none" stroke="#22c07d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22" cy="7.5" r="2.2" fill="#4ade9b" />
      </svg>
      <span className="text-lg font-semibold tracking-tight">
        Vanta<span className="text-accent-400">FX</span>
      </span>
    </span>
  );
}
