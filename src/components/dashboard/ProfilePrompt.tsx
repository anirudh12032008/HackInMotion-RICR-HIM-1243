"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { HeartPulse, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ProfilePrompt() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  const hasProfile =
    session?.user?.healthProfile &&
    (session.user.healthProfile.conditions.length > 0 ||
      session.user.healthProfile.ageGroup !== "adult" ||
      session.user.healthProfile.activityLevel !== "moderate");

  if (hasProfile || dismissed) return null;

  return (
    <Alert className="flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <AlertTitle>Personalize your guidance</AlertTitle>
          <AlertDescription>
            Set up your health profile to get advice tailored to you instead of generic
            recommendations.{" "}
            <Link href="/dashboard/profile" className="font-medium text-primary hover:underline">
              Complete your profile
            </Link>
          </AlertDescription>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </Alert>
  );
}
