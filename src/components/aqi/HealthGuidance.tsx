import { ShieldAlert, Wind, Activity, DoorOpen } from "lucide-react";
import { getHealthGuidance } from "@/lib/risk-engine";
import { UserHealthProfile } from "@/types/index";

export function HealthGuidance({ aqi, profile }: { aqi: number; profile: UserHealthProfile }) {
  const guidance = getHealthGuidance(aqi, profile);

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{guidance.outdoorActivity}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Exercise</p>
            <p className="text-sm">{guidance.exerciseAdvice}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <DoorOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Windows</p>
            <p className="text-sm">{guidance.windowAdvice}</p>
          </div>
        </div>
      </div>

      {guidance.shouldWearMask && guidance.maskType && (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/30">
          <Wind className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
          <p className="text-sm text-orange-800 dark:text-orange-300">{guidance.maskType}</p>
        </div>
      )}

      {guidance.precautions.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" /> Precautions for you
          </p>
          <ul className="space-y-1 text-sm">
            {guidance.precautions.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">•</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Recommendations</p>
        <ul className="space-y-1 text-sm">
          {guidance.recommendations.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary">•</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
