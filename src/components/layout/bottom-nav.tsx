"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, TrendingUp, User, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand";

const ITEMS = [
  { href: "/", label: "Accueil", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/entrainement",
    label: "Entraînement",
    icon: Dumbbell,
    match: (p: string) =>
      p.startsWith("/entrainement") ||
      p.startsWith("/programmes") ||
      p.startsWith("/exercices") ||
      p.startsWith("/historique") ||
      p.startsWith("/calendrier"),
  },
  { href: "/nutrition", label: "Nutrition", icon: UtensilsCrossed, match: (p: string) => p.startsWith("/nutrition") },
  {
    href: "/progression",
    label: "Progression",
    icon: TrendingUp,
    match: (p: string) =>
      p.startsWith("/progression") || p.startsWith("/statistiques") || p.startsWith("/records") || p.startsWith("/muscles"),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: User,
    match: (p: string) => p.startsWith("/profil") || p.startsWith("/parametres") || p.startsWith("/notifications") || p.startsWith("/admin"),
  },
];

/**
 * Navigation principale.
 *
 * Barre basse sur mobile et tablette (le pouce y accède naturellement),
 * rail latéral à partir de `lg` pour ne pas gaspiller la largeur sur un
 * ordinateur.
 */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed z-40 border-border bg-bg-elevated/85 backdrop-blur-xl",
        "inset-x-0 bottom-0 border-t",
        "lg:inset-y-0 lg:left-0 lg:right-auto lg:w-60 lg:border-r lg:border-t-0"
      )}
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Navigation principale"
    >
      <div className="hidden items-center gap-2.5 px-6 py-6 lg:flex">
        <Logo size={30} />
        <span className="text-lg font-bold tracking-tight">
          MUSCU<span className="text-accent">.</span>
        </span>
      </div>

      <ul className="mx-auto flex max-w-2xl lg:mx-0 lg:max-w-none lg:flex-col lg:gap-1 lg:px-3">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1 lg:flex-none">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[4.25rem] flex-col items-center justify-center gap-1 transition-colors",
                  "lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-3",
                  active
                    ? "text-accent lg:bg-accent-soft"
                    : "text-subtle hover:text-muted lg:hover:bg-surface-2"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-xl transition-colors lg:h-auto lg:w-auto",
                    active && "bg-accent-soft lg:bg-transparent"
                  )}
                >
                  <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={active ? 2.4 : 1.9} />
                </span>
                <span className="text-[0.66rem] font-medium tracking-tight lg:text-sm">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Conservé pour la compatibilité des imports existants. */
export const BottomNav = MainNav;
