import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/validators/risk-sectors";

const RISK_TONES: Record<RiskLevel, string> = {
  LOW: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  CRITICAL: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

/**
 * Tiny pill that colour-codes a risk level. Used everywhere a sector is
 * listed so the four baseline levels look consistent across the app.
 */
export function RiskLevelBadge({
  level,
  label,
  className,
}: {
  level: RiskLevel;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        RISK_TONES[level],
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
