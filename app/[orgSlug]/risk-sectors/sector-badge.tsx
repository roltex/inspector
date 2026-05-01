import { cn } from "@/lib/utils";
import type { RiskTone } from "@/lib/validators/risk-levels";

/**
 * Semantic tone tokens → Tailwind classes. Workspaces pick a tone when
 * they define a risk level, so colours stay consistent everywhere a
 * level chip is rendered.
 */
const TONE_CLASSES: Record<RiskTone, string> = {
  muted:
    "bg-muted text-muted-foreground",
  info:
    "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  success:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning:
    "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  danger:
    "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  critical:
    "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

/** Safely coerce unknown DB values to a known tone so typos can't crash the UI. */
export function normalizeTone(value: string | null | undefined): RiskTone {
  if (value && (value as RiskTone) in TONE_CLASSES) return value as RiskTone;
  return "muted";
}

/**
 * Tiny pill that colour-codes a risk level using its configured tone.
 * Used everywhere a level / sector is listed.
 */
export function RiskLevelBadge({
  tone,
  label,
  className,
}: {
  tone: RiskTone | string | null | undefined;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        TONE_CLASSES[normalizeTone(tone)],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
      />
      {label}
    </span>
  );
}
