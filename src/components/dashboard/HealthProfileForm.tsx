"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityLevel, AgeGroup, HealthCondition } from "@/types/index";

const CONDITIONS: { value: HealthCondition; label: string }[] = [
  { value: "asthma", label: "Asthma" },
  { value: "copd", label: "COPD" },
  { value: "heartDisease", label: "Heart Disease" },
  { value: "allergies", label: "Allergies" },
  { value: "pregnancy", label: "Pregnancy" },
  { value: "elderly", label: "Elderly dependent at home" },
  { value: "children", label: "Children at home" },
];

export function HealthProfileForm() {
  const { update } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.healthProfile) {
          setConditions(data.healthProfile.conditions ?? []);
          setAgeGroup(data.healthProfile.ageGroup ?? "adult");
          setActivityLevel(data.healthProfile.activityLevel ?? "moderate");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleCondition(value: HealthCondition, checked: boolean) {
    setConditions((prev) => (checked ? [...prev, value] : prev.filter((c) => c !== value)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conditions, ageGroup, activityLevel }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      await update({ healthProfile: { conditions, ageGroup, activityLevel } });
      toast.success("Health profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health profile</CardTitle>
        <p className="text-sm text-muted-foreground">
          This shapes the guidance you see on every AQI reading.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-2 block">Health conditions</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONDITIONS.map((c) => (
              <div key={c.value} className="flex items-center gap-2">
                <Checkbox
                  id={c.value}
                  checked={conditions.includes(c.value)}
                  onCheckedChange={(checked) => toggleCondition(c.value, checked === true)}
                />
                <Label htmlFor={c.value} className="font-normal">
                  {c.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block">Age group</Label>
            <Select value={ageGroup} onValueChange={(v) => setAgeGroup(v as AgeGroup)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="child">Child (&lt;12)</SelectItem>
                <SelectItem value="adult">Adult (18-60)</SelectItem>
                <SelectItem value="senior">Senior (60+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Activity level</Label>
            <Select
              value={activityLevel}
              onValueChange={(v) => setActivityLevel(v as ActivityLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="athlete">Athlete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
