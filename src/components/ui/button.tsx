"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "xl" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-contrast hover:brightness-110 active:brightness-95 shadow-[0_4px_20px_-6px_var(--accent)]",
  secondary: "bg-surface-2 text-text hover:bg-surface-3 border border-border",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  outline: "border border-border-strong text-text hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-110",
  success: "bg-success text-white hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-xl gap-1.5",
  md: "h-11 px-4 text-[0.95rem] rounded-2xl gap-2",
  lg: "h-13 px-5 text-base rounded-2xl gap-2",
  xl: "h-16 px-6 text-lg rounded-3xl gap-2.5 font-semibold",
  icon: "h-11 w-11 rounded-2xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, fullWidth, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        "active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none select-none",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
