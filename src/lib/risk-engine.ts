import { ActivityLevel, HealthCondition, RiskLevel, UserHealthProfile } from "@/types/index";

export interface RiskClassification {
  level: RiskLevel;
  label: string;
  color: string;
  bgColor: string;
  emoji: string;
  description: string;
}

const RISK_TABLE: { max: number; classification: RiskClassification }[] = [
  {
    max: 50,
    classification: {
      level: "good",
      label: "Good",
      color: "#22c55e",
      bgColor: "#dcfce7",
      emoji: "🌿",
      description: "Air quality is satisfactory, and air pollution poses little or no risk.",
    },
  },
  {
    max: 100,
    classification: {
      level: "moderate",
      label: "Moderate",
      color: "#eab308",
      bgColor: "#fef9c3",
      emoji: "🙂",
      description: "Acceptable air quality, though there is moderate concern for sensitive people.",
    },
  },
  {
    max: 150,
    classification: {
      level: "unhealthy_sensitive",
      label: "Unhealthy for Sensitive Groups",
      color: "#f97316",
      bgColor: "#ffedd5",
      emoji: "😷",
      description: "Sensitive groups may experience health effects. The general public is less likely to be affected.",
    },
  },
  {
    max: 200,
    classification: {
      level: "unhealthy",
      label: "Unhealthy",
      color: "#ef4444",
      bgColor: "#fee2e2",
      emoji: "⚠️",
      description: "Everyone may begin to experience health effects; sensitive groups may experience more serious effects.",
    },
  },
  {
    max: 300,
    classification: {
      level: "very_unhealthy",
      label: "Very Unhealthy",
      color: "#8b5cf6",
      bgColor: "#ede9fe",
      emoji: "🚨",
      description: "Health alert: everyone may experience more serious health effects.",
    },
  },
  {
    max: Infinity,
    classification: {
      level: "hazardous",
      label: "Hazardous",
      color: "#991b1b",
      bgColor: "#fecaca",
      emoji: "☠️",
      description: "Health warning of emergency conditions: everyone is more likely to be affected.",
    },
  },
];

export function classifyRisk(aqi: number): RiskClassification {
  const entry = RISK_TABLE.find((r) => aqi <= r.max) ?? RISK_TABLE[RISK_TABLE.length - 1];
  return entry.classification;
}

export interface HealthGuidance {
  outdoorActivity: string;
  precautions: string[];
  recommendations: string[];
  shouldWearMask: boolean;
  maskType: string | null;
  exerciseAdvice: string;
  windowAdvice: string;
}

const CONDITION_LABELS: Record<HealthCondition, string> = {
  asthma: "asthma",
  copd: "COPD",
  heartDisease: "heart disease",
  allergies: "allergies",
  pregnancy: "pregnancy",
  elderly: "an elderly family member",
  children: "children at home",
};

function isVulnerable(profile: UserHealthProfile): boolean {
  return (
    profile.conditions.length > 0 ||
    profile.ageGroup === "child" ||
    profile.ageGroup === "senior"
  );
}

function maskForAqi(aqi: number): string | null {
  if (aqi <= 100) return null;
  if (aqi <= 150) return "N95 or KN95 mask recommended outdoors";
  if (aqi <= 200) return "N95/KN95 mask required outdoors";
  return "N99/P100 mask required — minimize all outdoor exposure";
}

function exerciseAdviceFor(aqi: number, activityLevel: ActivityLevel, vulnerable: boolean): string {
  const threshold = vulnerable ? 100 : activityLevel === "athlete" ? 100 : 150;

  if (aqi <= 50) return "Great conditions for any outdoor workout.";
  if (aqi <= 100) {
    return vulnerable
      ? "Keep outdoor exertion light to moderate and watch for symptoms."
      : "Fine for normal outdoor activity; sensitive individuals should ease up on intensity.";
  }
  if (aqi <= threshold) {
    return activityLevel === "athlete" || activityLevel === "active"
      ? "Reduce prolonged or intense outdoor exertion — shorten your run or move it indoors."
      : "Reduce prolonged outdoor exertion.";
  }
  if (aqi <= 200) {
    return "Postpone outdoor exercise. Move workouts indoors with filtered/purified air.";
  }
  return "Avoid all outdoor exertion. Stay indoors with an air purifier running.";
}

export function getHealthGuidance(aqi: number, profile: UserHealthProfile): HealthGuidance {
  const vulnerable = isVulnerable(profile);
  const precautions: string[] = [];
  const recommendations: string[] = [];

  let outdoorActivity: string;
  if (aqi <= 50) {
    outdoorActivity = "It's a great day to be outside.";
  } else if (aqi <= 100) {
    outdoorActivity = vulnerable
      ? "Limit prolonged outdoor activity if you notice symptoms."
      : "Enjoy the outdoors as usual.";
  } else if (aqi <= 150) {
    outdoorActivity = vulnerable
      ? "Stay indoors as much as possible today."
      : "Reduce prolonged or heavy outdoor exertion.";
  } else if (aqi <= 200) {
    outdoorActivity = "Avoid prolonged outdoor activity — everyone may be affected.";
  } else if (aqi <= 300) {
    outdoorActivity = "Stay indoors. Avoid outdoor activity entirely.";
  } else {
    outdoorActivity = "Emergency conditions — remain indoors with windows sealed.";
  }

  if (aqi > 100) {
    for (const condition of profile.conditions) {
      switch (condition) {
        case "asthma":
          precautions.push("Keep your rescue inhaler accessible at all times.");
          break;
        case "copd":
          precautions.push("Monitor your breathing closely and avoid exertion outdoors.");
          break;
        case "heartDisease":
          precautions.push("Avoid strenuous activity — poor air quality raises cardiovascular strain.");
          break;
        case "allergies":
          precautions.push("Consider antihistamines if pollutant levels aggravate symptoms.");
          break;
        case "pregnancy":
          precautions.push("Limit outdoor exposure — pollution exposure during pregnancy carries added risk.");
          break;
        case "elderly":
          precautions.push("Check in on elderly family members and encourage staying indoors.");
          break;
        case "children":
          precautions.push("Keep children indoors and avoid outdoor play today.");
          break;
      }
    }
  }

  if (aqi > 150) {
    recommendations.push("Run an air purifier indoors if you have one.");
  }
  if (aqi > 100) {
    recommendations.push(`Check on any household members with ${describeConditions(profile.conditions)}.`);
  }
  if (vulnerable && aqi > 100 && recommendations.length === 0) {
    recommendations.push("Keep windows closed and monitor local air quality updates.");
  }
  if (recommendations.length === 0) {
    recommendations.push("No special precautions needed today.");
  }

  const windowAdvice =
    aqi <= 100
      ? "Windows can stay open for fresh air."
      : aqi <= 150
        ? vulnerable
          ? "Keep windows closed, especially in bedrooms."
          : "Consider keeping windows closed during peak hours."
        : "Keep all windows and doors closed. Use an air purifier if available.";

  return {
    outdoorActivity,
    precautions,
    recommendations,
    shouldWearMask: aqi > 100,
    maskType: maskForAqi(aqi),
    exerciseAdvice: exerciseAdviceFor(aqi, profile.activityLevel, vulnerable),
    windowAdvice,
  };
}

function describeConditions(conditions: HealthCondition[]): string {
  if (conditions.length === 0) return "sensitivities";
  return conditions.map((c) => CONDITION_LABELS[c]).join(", ");
}

export interface PollutantAdvice {
  name: string;
  fullName: string;
  sources: string;
  healthEffects: string;
  specificAdvice: string;
}

const POLLUTANT_INFO: Record<string, PollutantAdvice> = {
  pm25: {
    name: "PM2.5",
    fullName: "Fine Particulate Matter",
    sources: "Vehicle exhaust, wildfires, industrial combustion, dust",
    healthEffects: "Penetrates deep into lungs and bloodstream; linked to respiratory and cardiovascular issues.",
    specificAdvice: "Wear a well-fitted N95 mask outdoors; use a HEPA air purifier indoors.",
  },
  pm10: {
    name: "PM10",
    fullName: "Coarse Particulate Matter",
    sources: "Construction dust, road dust, pollen, mold",
    healthEffects: "Irritates eyes, nose, and throat; can worsen asthma and bronchitis.",
    specificAdvice: "Avoid dusty areas and keep windows closed on high-wind days.",
  },
  o3: {
    name: "O3",
    fullName: "Ground-level Ozone",
    sources: "Reaction of sunlight with vehicle and industrial emissions",
    healthEffects: "Irritates airways, reduces lung function, worsens asthma — peaks in afternoon heat.",
    specificAdvice: "Avoid outdoor exercise in the afternoon; ozone levels are typically lower in the morning.",
  },
  no2: {
    name: "NO2",
    fullName: "Nitrogen Dioxide",
    sources: "Vehicle traffic, power plants, industrial emissions",
    healthEffects: "Inflames airways and can worsen asthma symptoms, especially near busy roads.",
    specificAdvice: "Avoid exercising near heavy traffic corridors.",
  },
  so2: {
    name: "SO2",
    fullName: "Sulfur Dioxide",
    sources: "Fossil fuel combustion, industrial processes, volcanic activity",
    healthEffects: "Irritates the respiratory tract; can trigger bronchoconstriction in asthmatics.",
    specificAdvice: "People with asthma should keep rescue medication on hand.",
  },
  co: {
    name: "CO",
    fullName: "Carbon Monoxide",
    sources: "Vehicle exhaust, incomplete combustion of fuels",
    healthEffects: "Reduces oxygen delivery in the bloodstream; dangerous in enclosed spaces.",
    specificAdvice: "Avoid idling vehicles or enclosed garages; ensure good ventilation indoors.",
  },
};

export function getPollutantAdvice(pollutant: string): PollutantAdvice {
  const key = pollutant.toLowerCase().replace(".", "");
  return (
    POLLUTANT_INFO[key] ?? {
      name: pollutant.toUpperCase(),
      fullName: "Unknown pollutant",
      sources: "Data unavailable",
      healthEffects: "Data unavailable",
      specificAdvice: "Follow general air quality guidance for the current AQI level.",
    }
  );
}
