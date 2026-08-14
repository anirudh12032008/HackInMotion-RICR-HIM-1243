import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { HealthProfileForm } from "@/components/dashboard/HealthProfileForm";
import { NotificationPreferences } from "@/components/dashboard/NotificationPreferences";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? "Account";
  const email = session?.user?.email;
  const initial = name[0]?.toUpperCase() ?? "U";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Tell us about your health so we can tailor air quality guidance to you.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 py-5">
          <Avatar className="h-12 w-12 text-base">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            {email && <p className="truncate text-sm text-muted-foreground">{email}</p>}
          </div>
        </CardContent>
      </Card>

      <HealthProfileForm />
      <NotificationPreferences />
    </div>
  );
}
