"use client";

/** Anneau de progression calorique — lisible d'un coup d'œil. */
export function MacroRing({
  value,
  max,
  size = 84,
  stroke = 9,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
}) {
  const ratio = max > 0 ? value / max : 0;
  const clamped = Math.min(1, Math.max(0, ratio));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const over = ratio > 1.02;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--warning)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-lg font-bold leading-none">{Math.round(ratio * 100)}</span>
        <span className="text-[0.6rem] font-medium uppercase tracking-wide text-subtle">%</span>
      </div>
    </div>
  );
}
