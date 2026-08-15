"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flame, Factory, Wind, FlaskConical, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CommunityReportSeverity, CommunityReportType } from "@/types/index";

const TYPES: { value: CommunityReportType; label: string; icon: typeof Flame }[] = [
  { value: "smoke", label: "Smoke", icon: Wind },
  { value: "burning_waste", label: "Burning waste", icon: Flame },
  { value: "industrial_emission", label: "Industrial emission", icon: Factory },
  { value: "dust_storm", label: "Dust storm", icon: Wind },
  { value: "chemical_smell", label: "Chemical smell", icon: FlaskConical },
  { value: "other", label: "Other", icon: HelpCircle },
];

const SEVERITIES: { value: CommunityReportSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function ReportForm({
  open,
  onOpenChange,
  location,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: { lat: number; lng: number } | null;
  onSubmitted: () => void;
}) {
  const [type, setType] = useState<CommunityReportType>("smoke");
  const [severity, setSeverity] = useState<CommunityReportSeverity>("medium");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!location) {
      toast.error("Click a spot on the map first to set the report location");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...location, type, severity, description }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to submit report");
      toast.success("Report submitted");
      setDescription("");
      onOpenChange(false);
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an environmental issue</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">
              {location ? "Location set from your map click" : "Click the map to set a location"}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                    type === t.value
                      ? "border-primary bg-accent text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Severity</Label>
            <div className="flex gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                    severity === s.value
                      ? "border-primary bg-accent text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="mb-2 block">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="What are you seeing or smelling?"
              maxLength={500}
              rows={3}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {description.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting || !location} className="w-full">
            {submitting ? "Submitting..." : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
