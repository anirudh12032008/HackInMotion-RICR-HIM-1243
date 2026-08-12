"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Plus, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportForm } from "@/components/dashboard/ReportForm";
import type { CommunityReportPoint } from "@/components/map/CommunityMap";
import { TYPE_LABELS } from "@/components/map/CommunityMap";

const CommunityMap = dynamic(
  () => import("@/components/map/CommunityMap").then((m) => m.CommunityMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];

export default function CommunityPage() {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [reports, setReports] = useState<CommunityReportPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);

  const loadReports = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    const res = await fetch(`/api/community?lat=${lat}&lng=${lng}&radius=25`);
    const data = await res.json();
    setReports(data.reports ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCenter(next);
          loadReports(next[0], next[1]);
        },
        () => loadReports(DEFAULT_CENTER[0], DEFAULT_CENTER[1])
      );
    } else {
      loadReports(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }
  }, [loadReports]);

  function handleMapClick(lat: number, lng: number) {
    setPendingLocation({ lat, lng });
    setFormOpen(true);
  }

  async function upvote(reportId: string) {
    const res = await fetch(`/api/community/${reportId}/upvote`, { method: "PUT" });
    if (!res.ok) {
      toast.error("Failed to upvote");
      return;
    }
    loadReports(center[0], center[1]);
  }

  const sortedReports = [...reports].sort((a, b) => b.upvotes.length - a.upvotes.length);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl flex-col gap-4 lg:flex-row">
      <div className="relative min-h-64 flex-1 overflow-hidden rounded-xl border">
        <CommunityMap center={center} reports={reports} onMapClick={handleMapClick} />
        <Button
          size="icon"
          className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
          onClick={() => {
            setPendingLocation(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="w-full space-y-3 overflow-y-auto lg:w-80">
        <h2 className="text-sm font-semibold">Recent reports nearby</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : sortedReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reports nearby in the last 24 hours. Click the map or the + button to add one.
          </p>
        ) : (
          sortedReports.map((r) => (
            <Card key={r._id}>
              <CardContent className="space-y-1 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{TYPE_LABELS[r.type]}</p>
                  <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => upvote(r._id)}>
                    <ThumbsUp className="h-3 w-3" />
                    {r.upvotes.length}
                  </Button>
                </div>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                <p className="text-xs text-muted-foreground">
                  {r.severity} severity · {new Date(r.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ReportForm
        open={formOpen}
        onOpenChange={setFormOpen}
        location={pendingLocation}
        onSubmitted={() => loadReports(center[0], center[1])}
      />
    </div>
  );
}
