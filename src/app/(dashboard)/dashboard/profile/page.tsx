import { HealthProfileForm } from "@/components/dashboard/HealthProfileForm";
import { NotificationPreferences } from "@/components/dashboard/NotificationPreferences";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Tell us about your health so we can tailor air quality guidance to you.
        </p>
      </div>
      <HealthProfileForm />
      <NotificationPreferences />
    </div>
  );
}
