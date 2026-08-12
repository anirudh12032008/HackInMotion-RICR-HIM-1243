import { classifyRisk } from "@/lib/risk-engine";
import { cn } from "@/lib/utils";

export function RiskBadge({ aqi, className }: { aqi: number; className?: string }) {
  const risk = classifyRisk(aqi);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      style={{ backgroundColor: risk.bgColor, color: risk.color }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: risk.color }} />
      {risk.label}
    </span>
  );
}
