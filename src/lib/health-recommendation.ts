import type { HealthRecommendations } from "@/lib/google-aqi";

const CONDITION_TO_RECOMMENDATION: Record<string, keyof HealthRecommendations> = {
  asthma: "lungDiseasePopulation",
  copd: "lungDiseasePopulation",
  heartDisease: "heartDiseasePopulation",
  pregnancy: "pregnantWomen",
  elderly: "elderly",
  children: "children",
};

/** Picks the single most relevant Google health recommendation for a user's profile. */
export function pickHealthRecommendation(
  recs: HealthRecommendations | undefined | null,
  conditions: string[],
  activityLevel?: string
): { text: string; audience: string } | null {
  if (!recs) return null;

  for (const condition of conditions) {
    const key = CONDITION_TO_RECOMMENDATION[condition];
    if (key && recs[key]) return { text: recs[key]!, audience: condition };
  }
  if (activityLevel === "athlete" && recs.athletes) {
    return { text: recs.athletes, audience: "athletes" };
  }
  if (recs.generalPopulation) return { text: recs.generalPopulation, audience: "general" };
  return null;
}
