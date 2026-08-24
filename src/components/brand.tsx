import { cn } from "@/lib/utils";

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Muscu"
    >
      <rect width="512" height="512" rx="112" fill="var(--surface-2)" />
      <g fill="var(--accent)">
        <rect x="60" y="216" width="52" height="80" rx="18" />
        <rect x="124" y="184" width="60" height="144" rx="22" />
        <rect x="184" y="238" width="144" height="36" rx="18" />
        <rect x="328" y="184" width="60" height="144" rx="22" />
        <rect x="400" y="216" width="52" height="80" rx="18" />
      </g>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={34} />
      <span className="text-xl font-bold tracking-tight">
        MUSCU<span className="text-accent">.</span>
      </span>
    </div>
  );
}
