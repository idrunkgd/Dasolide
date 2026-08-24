"use client";

import { useState } from "react";
import { Select } from "@/components/ui/field";
import { PHOTO_POSES } from "@/lib/constants";
import { formatDate, formatNumber1, parseDateKey } from "@/lib/utils";
import { weightOut, type WeightUnit } from "./units";
import type { ProgressPhotoItem } from "./photo-gallery";

/**
 * Comparateur avant / après : la seconde photo est révélée progressivement
 * par-dessus la première à mesure que l'on déplace le curseur.
 */
export function PhotoCompare({ photos, unit }: { photos: ProgressPhotoItem[]; unit: WeightUnit }) {
  const oldest = photos[photos.length - 1];
  const newest = photos[0];
  const [beforeId, setBeforeId] = useState(oldest?.id ?? "");
  const [afterId, setAfterId] = useState(newest?.id ?? "");
  const [position, setPosition] = useState(50);

  const before = photos.find((p) => p.id === beforeId) ?? oldest;
  const after = photos.find((p) => p.id === afterId) ?? newest;
  if (!before || !after) return null;

  return (
    <div>
      <div className="relative h-[22rem] select-none overflow-hidden rounded-2xl bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before.url}
          alt={`Avant — ${formatDate(parseDateKey(before.date))}`}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{ clipPath: `polygon(${position}% 0, 100% 0, 100% 100%, ${position}% 100%)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={after.url}
            alt={`Après — ${formatDate(parseDateKey(after.date))}`}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        </div>

        {/* Poignée */}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent"
          style={{ left: `${position}%` }}
        >
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-accent bg-bg-elevated text-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
            </svg>
          </span>
        </div>

        <span className="pointer-events-none absolute left-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-[0.7rem] font-medium text-white">
          Avant · {formatDate(parseDateKey(before.date))}
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-[0.7rem] font-medium text-white">
          Après · {formatDate(parseDateKey(after.date))}
        </span>

        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          aria-label="Position du comparateur"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <PhotoSelect label="Avant" value={before.id} photos={photos} onChange={setBeforeId} />
        <PhotoSelect label="Après" value={after.id} photos={photos} onChange={setAfterId} />
      </div>

      {before.weightKg != null && after.weightKg != null ? (
        <p className="tabular mt-3 text-center text-sm text-muted">
          {formatNumber1(weightOut(before.weightKg, unit))} {unit} → {formatNumber1(weightOut(after.weightKg, unit))} {unit}
        </p>
      ) : null}
    </div>
  );
}

function PhotoSelect({
  label,
  value,
  photos,
  onChange,
}: {
  label: string;
  value: string;
  photos: ProgressPhotoItem[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {photos.map((p) => (
          <option key={p.id} value={p.id}>
            {formatDate(parseDateKey(p.date))} · {PHOTO_POSES[p.pose as keyof typeof PHOTO_POSES] ?? p.pose}
          </option>
        ))}
      </Select>
    </label>
  );
}
