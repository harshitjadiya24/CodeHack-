import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "board";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "border border-rule bg-card text-ink hover:border-ink",
  ghost: "text-ink-2 hover:bg-paper-2 hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90",
  board: "board-chip hover:brightness-95",
};

// Press feedback is a short scale, never a delay: buttons are pressed many times a day.
const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-[15px] font-semibold transition-[transform,opacity,background-color,border-color] duration-150 ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

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

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-rule bg-card", className)} {...props} />;
}

export type Tone = "neutral" | "accent" | "saffron" | "ok" | "warn" | "danger" | "info";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-2",
  accent: "border border-ink text-ink",
  saffron: "bg-saffron-soft text-saffron",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

/** A status cell, set like a code on the reservation chart. */
export function Pill({ tone = "neutral", className, children, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("chart-code inline-flex items-center gap-1 whitespace-nowrap rounded-[4px] px-2 py-0.5 text-[13px] leading-5", toneStyles[tone], className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
      <div>
        {eyebrow && <p className="mb-2 text-[15px] font-semibold text-subtle">{eyebrow}</p>}
        <h1 className="type-h2 text-ink">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-rule px-6 py-14 text-center">
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
  "w-full min-h-11 rounded-md border border-rule bg-card px-3 py-2 text-base text-ink placeholder:text-subtle transition-colors focus:border-ink focus:outline-none";

export function Mono({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("font-mono text-xs text-subtle", className)} {...props} />;
}
