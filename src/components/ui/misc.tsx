"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-3 text-muted",
    accent: "bg-accent-soft text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    info: "bg-info/15 text-info",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  color,
  className,
  height = 8,
  showOverflow = true,
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
  height?: number;
  showOverflow?: boolean;
}) {
  const ratio = max > 0 ? value / max : 0;
  const pct = Math.min(100, Math.max(0, ratio * 100));
  const over = showOverflow && ratio > 1;
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: over ? "var(--warning)" : (color ?? "var(--accent)"),
        }}
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card p-3.5", className)}>
      <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-subtle">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="tabular mt-1.5 text-xl font-semibold leading-none">{value}</div>
      {sub ? <div className="mt-1.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-surface-2 text-subtle">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="mt-1.5 max-w-xs text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

/** Onglets défilants horizontalement — utilisés pour les filtres de période. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 shrink-0 whitespace-nowrap rounded-xl font-medium transition-colors",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
              active ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Feuille modale montant du bas — le geste naturel sur mobile. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  fullHeight,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  fullHeight?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-slide-up relative flex w-full max-w-lg flex-col overflow-hidden",
          "rounded-t-[1.75rem] border border-border bg-bg-elevated sm:rounded-[1.75rem]",
          fullHeight ? "h-[92dvh]" : "max-h-[88dvh]"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="-mr-2 rounded-xl p-2 text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Fermer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-border bg-bg-elevated px-5 py-3.5 pb-[max(0.875rem,var(--safe-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Petite notification éphémère (confirmation d'action). */
export function useToast() {
  const [message, setMessage] = React.useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const show = React.useCallback((text: string, tone: "ok" | "error" = "ok") => {
    setMessage({ text, tone });
    window.setTimeout(() => setMessage(null), 2600);
  }, []);
  const node = message ? (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-height)+1.5rem)] z-[60] flex justify-center px-4">
      <div
        className={cn(
          "animate-fade-up rounded-2xl px-4 py-3 text-sm font-medium shadow-lg",
          message.tone === "ok" ? "bg-surface-3 text-text" : "bg-danger text-white"
        )}
      >
        {message.text}
      </div>
    </div>
  ) : null;
  return { show, node };
}
