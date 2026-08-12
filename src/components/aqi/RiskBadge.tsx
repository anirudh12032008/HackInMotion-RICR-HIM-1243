"use client";

import { classifyRisk } from "@/lib/risk-engine";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function RiskBadge({ aqi, className }: { aqi: number; className?: string }) {
  const risk = classifyRisk(aqi);
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      style={{ backgroundColor: risk.bgColor, color: risk.color }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: risk.color }} />
      {t(`risk.${risk.level}`)}
    </span>
  );
}
