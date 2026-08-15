export type HealthCondition =
  "asthma" | "copd" | "heartDisease" | "allergies" | "pregnancy" | "elderly" | "children";

export type AgeGroup = "child" | "adult" | "senior";

export type ActivityLevel = "sedentary" | "moderate" | "active" | "athlete";

export interface UserHealthProfile {
  conditions: HealthCondition[];
  ageGroup: AgeGroup;
  activityLevel: ActivityLevel;
}

export type RiskLevel =
  "good" | "moderate" | "unhealthy_sensitive" | "unhealthy" | "very_unhealthy" | "hazardous";

export interface Pollutants {
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  so2?: number;
  co?: number;
}

export type AlertType = "threshold_exceeded" | "rapid_change" | "forecast_warning";
export type AlertSeverity = "info" | "warning" | "danger" | "emergency";

export type CommunityReportType =
  "smoke" | "burning_waste" | "industrial_emission" | "dust_storm" | "chemical_smell" | "other";

export type CommunityReportSeverity = "low" | "medium" | "high";
