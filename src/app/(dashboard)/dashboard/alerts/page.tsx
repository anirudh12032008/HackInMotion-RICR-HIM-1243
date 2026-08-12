"use client";

import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { useTranslation } from "@/lib/i18n";

export default function AlertsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("alertsPage.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("alertsPage.subtitle")}</p>
      </div>
      <AlertsFeed />
    </div>
  );
}
