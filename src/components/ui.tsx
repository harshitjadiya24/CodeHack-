import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "board";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink",
  secondary: "border border-rule bg-card text-ink hover:border-subtle",
  ghost: "text-ink-2 hover:bg-card hover:text-ink",
  danger: "bg-danger text-paper",
  board: "tone-butter",
};

// Pills that lift a touch on hover (with a small overshoot) and press down on tap.
const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-[15px] font-semibold transition-[transform,opacity,background-color,border-color] duration-500 ease-[var(--ease-spring)] [@media(hover:hover)]:hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] active:duration-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cn(buttonBase, buttonStyles[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cn(buttonBase, buttonStyles[variant], className)} {...props} />;
}

/** A file download (an .ics, a CSV) styled as a button. A plain <a>, so the router doesn't try to render it as a page. */
export function DownloadLink({ variant = "secondary", className, ...props }: ComponentProps<"a"> & { variant?: ButtonVariant }) {
  return <a download className={cn(buttonBase, buttonStyles[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[22px] border border-rule bg-card", className)} {...props} />;
}

export type Tone = "neutral" | "accent" | "saffron" | "ok" | "warn" | "danger" | "info";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-2",
  accent: "bg-ink text-paper",
  saffron: "bg-saffron-soft text-saffron",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

/** A soft tag, like the label on something on the shared shelf. */
export function Pill({ tone = "neutral", className, children, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("chart-code inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] leading-5", toneStyles[tone], className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-3 text-[15px] text-subtle">{eyebrow}</p>}
        <h1 className="type-h2 max-w-[18ch] text-ink">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[28px] bg-card px-6 py-8 text-center">
      <p className="type-h3 text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-[15px] text-subtle">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[15px] font-semibold text-ink">{label}</span>
      {children}
      {hint && !error && <span className="block text-sm text-subtle">{hint}</span>}
      {error && <span className="block text-sm text-danger">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full min-h-12 rounded-2xl border border-rule bg-paper px-4 py-2 text-base text-ink placeholder:text-subtle transition-colors focus:border-sky-ink focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-sky";

export function Mono({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("font-mono text-xs text-subtle", className)} {...props} />;
}
