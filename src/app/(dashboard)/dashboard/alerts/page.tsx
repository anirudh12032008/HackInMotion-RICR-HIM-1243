import { AlertsFeed } from "@/components/dashboard/AlertsFeed";

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Threshold, rapid-change, and forecast warnings for your saved locations.
        </p>
      </div>
      <AlertsFeed />
    </div>
  );
}
