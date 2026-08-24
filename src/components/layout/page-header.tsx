"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
  sticky = true,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** `true` = retour navigateur, ou une URL explicite. */
  back?: boolean | string;
  action?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "z-30 flex items-center gap-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-xl",
        sticky && "sticky top-0",
        className
      )}
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      {back ? (
        typeof back === "string" ? (
          <Link
            href={back}
            aria-label="Retour"
            className="-ml-2 rounded-xl p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <button
            onClick={() => router.back()}
            aria-label="Retour"
            className="-ml-2 rounded-xl p-2 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )
      ) : null}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
        {subtitle ? <p className="truncate text-[0.8rem] text-muted">{subtitle}</p> : null}
      </div>

      {action}
    </header>
  );
}
