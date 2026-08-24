import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return <Tag className={cn("card p-4", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 flex items-center justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-[0.95rem] font-semibold", className)} {...props} />;
}

export function CardSubtitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

/** Libellé de section au-dessus d'un groupe de cartes. */
export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-2.5 flex items-end justify-between px-1", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{children}</h2>
      {action}
    </div>
  );
}
