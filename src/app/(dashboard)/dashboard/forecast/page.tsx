import { ForecastBoard } from "@/components/dashboard/ForecastBoard";

export default function ForecastPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forecast</h1>
        <p className="text-sm text-muted-foreground">
          Hour-by-hour for the next two days, plus a 5-day outlook, so you can plan outdoor activity
          ahead of time.
        </p>
      </div>
      <ForecastBoard />
    </div>
  );
}
