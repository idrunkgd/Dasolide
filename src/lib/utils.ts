import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Dates — l'application raisonne toujours en « jour local », jamais en UTC.
// ---------------------------------------------------------------------------

/** Renvoie une Date normalisée à minuit (utilisée comme clé de journée). */
export function startOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Clé stable "YYYY-MM-DD" pour les URLs et les Map. */
export function dateKey(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

/** Lundi de la semaine contenant `date`. */
export function startOfWeek(date: Date = new Date()): Date {
  const d = startOfDay(date);
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  return addDays(d, -day);
}

/**
 * Fuseau de référence de l'application.
 *
 * Il est explicite et identique côté serveur et côté navigateur : sans cela,
 * un serveur en UTC et un navigateur en Europe/Bruxelles n'affichent pas le
 * même jour pour une séance de fin de soirée, et React signale une divergence
 * d'hydratation. Modifiable via NEXT_PUBLIC_APP_TIMEZONE.
 */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Brussels";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: APP_TIMEZONE });
const DATE_LONG = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIMEZONE });
const DATE_SHORT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: APP_TIMEZONE });
const TIME_FMT = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIMEZONE });

export const formatDate = (d: Date | string) => DATE_FMT.format(new Date(d));
export const formatDateLong = (d: Date | string) => DATE_LONG.format(new Date(d));
export const formatDateShort = (d: Date | string) => DATE_SHORT.format(new Date(d));
export const formatTime = (d: Date | string) => TIME_FMT.format(new Date(d));

export function formatRelativeDay(d: Date | string): string {
  const diff = daysBetween(new Date(), new Date(d));
  if (diff === 0) return "Aujourd'hui";
  if (diff === -1) return "Hier";
  if (diff === 1) return "Demain";
  if (diff < 0 && diff > -7) return `Il y a ${-diff} jours`;
  if (diff > 0 && diff < 7) return `Dans ${diff} jours`;
  return formatDate(d);
}

/** "1:08:42" ou "08:42" selon la durée. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** "1 h 05" — format lisible pour les durées longues. */
export function formatDurationHuman(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Nombres & unités
// ---------------------------------------------------------------------------

const NUM = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const NUM1 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export const formatNumber = (n: number) => NUM.format(n);
export const formatNumber1 = (n: number) => NUM1.format(n);

/** Enlève les décimales inutiles : 82.5 → "82,5", 80 → "80". */
export function formatWeight(kg: number | null | undefined, unit: "kg" | "lb" = "kg"): string {
  if (kg == null) return "—";
  const v = unit === "lb" ? kg * 2.20462 : kg;
  return `${NUM1.format(Math.round(v * 10) / 10)} ${unit}`;
}

export function formatWeightValue(kg: number | null | undefined, unit: "kg" | "lb" = "kg"): string {
  if (kg == null) return "—";
  const v = unit === "lb" ? kg * 2.20462 : kg;
  return NUM1.format(Math.round(v * 10) / 10);
}

export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;
export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (i: number) => i * 2.54;

export function formatLength(cm: number | null | undefined, unit: "cm" | "in" = "cm"): string {
  if (cm == null) return "—";
  const v = unit === "in" ? cmToIn(cm) : cm;
  return `${NUM1.format(Math.round(v * 10) / 10)} ${unit}`;
}

/** 18420 → "18 420 kg" ; 1420000 → "1,42 t" */
export function formatVolume(kg: number): string {
  if (kg >= 1_000_000) return `${NUM1.format(kg / 1000)} t`.replace(/,0 /, " ");
  return `${NUM.format(Math.round(kg))} kg`;
}

export function formatSigned(n: number, digits = 1): string {
  const v = Math.round(n * 10 ** digits) / 10 ** digits;
  const s = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(Math.abs(v));
  if (v > 0) return `+${s}`;
  if (v < 0) return `−${s}`;
  return s;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return n > 1 ? (plural ?? `${singular}s`) : singular;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Arrondit à l'incrément le plus proche (2,5 kg par défaut). */
export function roundToIncrement(value: number, increment = 2.5): number {
  return Math.round(value / increment) * increment;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Recherche tolérante aux accents et à la casse. */
export function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function sum<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((acc, item) => acc + value(item), 0);
}
