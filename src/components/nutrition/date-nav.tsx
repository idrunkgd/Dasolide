import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dateKey, formatDateLong, formatRelativeDay, parseDateKey } from "@/lib/utils";

/** Navigation par journée : flèches, libellé lisible et retour à aujourd'hui. */
export function DateNav({ day, basePath = "/nutrition" }: { day: string; basePath?: string }) {
  const date = parseDateKey(day);
  const prev = dateKey(addDays(date, -1));
  const next = dateKey(addDays(date, 1));
  const today = dateKey(new Date());
  const isToday = day === today;

  return (
    <div className="mb-4 flex items-center gap-2">
      <Link
        href={`${basePath}?date=${prev}`}
        aria-label="Jour précédent"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>

      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-[0.95rem] font-semibold">{formatRelativeDay(date)}</p>
        <p className="truncate text-xs capitalize text-subtle">{formatDateLong(date)}</p>
      </div>

      <Link
        href={`${basePath}?date=${next}`}
        aria-label="Jour suivant"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted transition-colors hover:text-text"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>

      {!isToday ? (
        <Link
          href={basePath}
          className="flex h-11 shrink-0 items-center rounded-2xl bg-accent-soft px-3.5 text-sm font-medium text-accent"
        >
          Aujourd&apos;hui
        </Link>
      ) : null}
    </div>
  );
}
