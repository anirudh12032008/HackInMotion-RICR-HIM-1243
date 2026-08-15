import type { ActivityLevel, AgeGroup, UserHealthProfile } from "@/types/index";

/**
 * Translates abstract pollutant numbers into consequences a person can feel.
 *
 * Two independent models live here:
 *
 * 1. **Cigarette equivalence**  Berkeley Earth's widely-cited rule of thumb:
 *    breathing 22 µg/m³ of PM2.5 for 24 hours delivers roughly the same fine
 *    particulate load as smoking one cigarette. It approximates particulate
 *    exposure only (not the tar, nicotine or carcinogens in tobacco smoke),
 *    which is exactly why the UI labels it as an equivalence, not a diagnosis.
 *
 * 2. **Inhaled dose**  the actual mass of PM2.5 entering the lungs, which is
 *    what turns "the AQI is the same for everyone" into something personal: a
 *    runner moves ~6x more air per hour than someone at a desk, so the same
 *    city air costs them ~6x the dose.
 */

/** Minute-ventilation by activity level, in m³ of air per hour. */
const BREATHING_RATE_M3_PER_HOUR: Record<ActivityLevel, number> = {
  sedentary: 0.42,
  moderate: 0.7,
  active: 1.4,
  athlete: 2.6,
};

/**
 * Children breathe more air per kg of body weight and have developing lungs;
 * seniors have reduced particulate clearance. Both take more harm per µg.
 */
const AGE_SUSCEPTIBILITY: Record<AgeGroup, number> = {
  child: 1.6,
  adult: 1,
  senior: 1.3,
};

/**
 * Approximates minute ventilation from live heart rate when a Bluetooth
 * heart-rate monitor is connected (see lib/wearable.ts), instead of a
 * self-reported activity level. Minute ventilation rises roughly linearly
 * with heart rate between resting and near-maximal exertion  not exact
 * (real VE also depends on fitness and terrain), but far more personal than
 * a fixed "moderate/active/athlete" bucket. Anchored to the same sedentary
 * and athlete rates already used above, so results stay in the same units
 * and don't jump discontinuously when a wearable connects or disconnects.
 */
const RESTING_HR_BPM = 70;
const MAX_EXERTION_HR_BPM = 180;

function breathingRateFromHeartRate(bpm: number): number {
  const t = Math.min(
    1,
    Math.max(0, (bpm - RESTING_HR_BPM) / (MAX_EXERTION_HR_BPM - RESTING_HR_BPM))
  );
  const { sedentary, athlete } = BREATHING_RATE_M3_PER_HOUR;
  return sedentary + t * (athlete - sedentary);
}

const PM25_PER_CIGARETTE = 22; // µg/m³ sustained for 24 h
const WHO_24H_GUIDELINE = 15; // µg/m³

export interface ExposureEstimate {
  /** PM2.5 concentration the estimate was built from, µg/m³. */
  pm25: number;
  /** True when pm25 was derived from AQI rather than reported directly. */
  estimated: boolean;
  /** Cigarettes-per-day equivalent if this air persisted for 24 h. */
  cigarettesPerDay: number;
  /** Cigarette equivalent for one hour outdoors at the user's activity level. */
  cigarettesPerHourOutdoors: number;
  /** Micrograms of PM2.5 inhaled per hour outdoors at the user's activity level. */
  microgramsPerHour: number;
  /** Susceptibility-weighted dose  the number we rank personal risk on. */
  effectiveDosePerHour: number;
  /** How many times over the WHO 24-hour guideline (15 µg/m³) this air sits. */
  timesWhoGuideline: number;
  /** Plain-language one-liner, safe to render with no further formatting. */
  headline: string;
}

/**
 * US EPA piecewise-linear PM2.5 breakpoints (2024 revision). Used to back a
 * concentration out of an AQI when Google reports an index without a PM2.5
 * concentration, so the feature degrades to a labelled estimate rather than
 * vanishing from the UI.
 */
const EPA_PM25_BREAKPOINTS: { aqiLow: number; aqiHigh: number; cLow: number; cHigh: number }[] = [
  { aqiLow: 0, aqiHigh: 50, cLow: 0, cHigh: 9 },
  { aqiLow: 51, aqiHigh: 100, cLow: 9.1, cHigh: 35.4 },
  { aqiLow: 101, aqiHigh: 150, cLow: 35.5, cHigh: 55.4 },
  { aqiLow: 151, aqiHigh: 200, cLow: 55.5, cHigh: 125.4 },
  { aqiLow: 201, aqiHigh: 300, cLow: 125.5, cHigh: 225.4 },
  { aqiLow: 301, aqiHigh: 500, cLow: 225.5, cHigh: 325.4 },
];

export function pm25FromAqi(aqi: number): number {
  const band =
    EPA_PM25_BREAKPOINTS.find((b) => aqi <= b.aqiHigh) ??
    EPA_PM25_BREAKPOINTS[EPA_PM25_BREAKPOINTS.length - 1];
  const span = band.aqiHigh - band.aqiLow || 1;
  const ratio = (Math.min(aqi, band.aqiHigh) - band.aqiLow) / span;
  return round1(band.cLow + ratio * (band.cHigh - band.cLow));
}

export function estimateExposure(
  aqi: number,
  pm25: number | undefined,
  profile: UserHealthProfile,
  liveHeartRateBpm?: number
): ExposureEstimate {
  const reported = typeof pm25 === "number" && pm25 > 0;
  const concentration = reported ? pm25! : pm25FromAqi(aqi);
  const breathingRate =
    typeof liveHeartRateBpm === "number"
      ? breathingRateFromHeartRate(liveHeartRateBpm)
      : (BREATHING_RATE_M3_PER_HOUR[profile.activityLevel] ?? 0.7);
  const susceptibility = AGE_SUSCEPTIBILITY[profile.ageGroup] ?? 1;

  const cigarettesPerDay = concentration / PM25_PER_CIGARETTE;
  const microgramsPerHour = concentration * breathingRate;
  // One cigarette ≈ a full day at 22 µg/m³ breathing at the resting baseline.
  const microgramsPerCigarette = PM25_PER_CIGARETTE * BREATHING_RATE_M3_PER_HOUR.sedentary * 24;

  return {
    pm25: round1(concentration),
    estimated: !reported,
    cigarettesPerDay: round1(cigarettesPerDay),
    cigarettesPerHourOutdoors: round2(microgramsPerHour / microgramsPerCigarette),
    microgramsPerHour: round1(microgramsPerHour),
    effectiveDosePerHour: round1(microgramsPerHour * susceptibility),
    timesWhoGuideline: round1(concentration / WHO_24H_GUIDELINE),
    headline: headlineFor(cigarettesPerDay, concentration),
  };
}

function headlineFor(cigarettesPerDay: number, pm25: number): string {
  if (cigarettesPerDay < 0.25) {
    return "Breathing this air all day is roughly equivalent to not smoking at all.";
  }
  if (cigarettesPerDay < 1) {
    return `A full day outdoors here is about ${round1(cigarettesPerDay)} of a cigarette in fine-particle exposure.`;
  }
  const whole = Math.round(cigarettesPerDay);
  if (cigarettesPerDay < 5) {
    return `Spending 24 hours in this air is comparable to smoking about ${whole} cigarette${whole === 1 ? "" : "s"}.`;
  }
  return `At ${round1(pm25)} µg/m³, a day in this air is comparable to smoking around ${whole} cigarettes.`;
}

/**
 * A location's rolling exposure "budget" over its recorded history. WHO's
 * 24-hour PM2.5 guideline is treated as 100% of a day's allowance, so a
 * percentage above 100 means the average day there overspends it.
 */
export function exposureBudgetUsed(dailyPm25Averages: number[]): {
  percentOfWhoBudget: number;
  daysOverGuideline: number;
  averagePm25: number;
} {
  if (dailyPm25Averages.length === 0) {
    return { percentOfWhoBudget: 0, daysOverGuideline: 0, averagePm25: 0 };
  }
  const average = dailyPm25Averages.reduce((a, b) => a + b, 0) / dailyPm25Averages.length;
  return {
    percentOfWhoBudget: Math.round((average / WHO_24H_GUIDELINE) * 100),
    daysOverGuideline: dailyPm25Averages.filter((v) => v > WHO_24H_GUIDELINE).length,
    averagePm25: round1(average),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
