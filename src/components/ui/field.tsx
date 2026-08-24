"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-muted", className)} {...props} />;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 text-text",
          "placeholder:text-subtle transition-colors",
          "focus:border-accent-border focus:bg-surface-3 focus:outline-none",
          "disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-text",
          "placeholder:text-subtle transition-colors resize-y min-h-24",
          "focus:border-accent-border focus:bg-surface-3 focus:outline-none",
          className
        )}
        {...props}
      />
    );
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-12 w-full appearance-none rounded-2xl border border-border bg-surface-2 px-4 pr-10 text-text",
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_0.9rem_center] bg-no-repeat",
          "focus:border-accent-border focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-danger">{children}</p>;
}

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {hint && !error ? <p className="mt-1.5 text-xs text-subtle">{hint}</p> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** Groupe de boutons radio en « pilules » — grande cible tactile. */
export function PillGroup<T extends string | number>({
  options,
  value,
  onChange,
  columns = 2,
  className,
}: {
  options: { value: T; label: React.ReactNode; hint?: string }[];
  value: T | null;
  onChange: (v: T) => void;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      role="radiogroup"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.98]",
              active
                ? "border-accent-border bg-accent-soft text-text"
                : "border-border bg-surface-2 text-muted hover:border-border-strong"
            )}
          >
            <span className={cn("block text-sm font-medium", active && "text-text")}>{opt.label}</span>
            {opt.hint ? <span className="mt-0.5 block text-xs text-subtle">{opt.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-[0.95rem]">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-subtle">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-surface-3"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </span>
    </button>
  );
}
