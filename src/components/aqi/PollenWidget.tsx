"use client";

import { useEffect, useState } from "react";
import { Flower2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PollenType {
  code: string;
  displayName: string;
  indexValue: number;
  category: string;
  color: string;
}

export function PollenWidget({ lat, lng }: { lat: number; lng: number }) {
  const [types, setTypes] = useState<PollenType[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pollen?lat=${lat}&lng=${lng}`)
      .then((res) => res.json())
      .then((data) => setTypes(data.types ?? []))
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (loading) return <Skeleton className="h-16 rounded-lg" />;
  if (!types || types.length === 0) return null;

  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Flower2 className="h-3.5 w-3.5" /> Pollen forecast
      </p>
      <div className="grid grid-cols-3 gap-2">
        {types.map((t) => (
          <div key={t.code} className="text-center">
            <p className="text-xs font-medium">{t.displayName}</p>
            <p className="text-sm font-semibold" style={{ color: t.color }}>
              {t.category}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
