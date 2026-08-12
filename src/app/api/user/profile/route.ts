import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireUserId } from "@/lib/session";
import { ActivityLevel, AgeGroup, HealthCondition } from "@/types/index";

const VALID_CONDITIONS: HealthCondition[] = [
  "asthma",
  "copd",
  "heartDisease",
  "allergies",
  "pregnancy",
  "elderly",
  "children",
];
const VALID_AGE_GROUPS: AgeGroup[] = ["child", "adult", "senior"];
const VALID_ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "moderate", "active", "athlete"];

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(userId).select("healthProfile name email language");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    name: user.name,
    email: user.email,
    healthProfile: user.healthProfile,
    language: user.language,
  });
}

export async function PUT(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const conditions: HealthCondition[] = Array.isArray(body.conditions)
    ? body.conditions.filter((c: string) => VALID_CONDITIONS.includes(c as HealthCondition))
    : [];
  const ageGroup: AgeGroup = VALID_AGE_GROUPS.includes(body.ageGroup) ? body.ageGroup : "adult";
  const activityLevel: ActivityLevel = VALID_ACTIVITY_LEVELS.includes(body.activityLevel)
    ? body.activityLevel
    : "moderate";

  await connectDB();
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { healthProfile: { conditions, ageGroup, activityLevel } } },
    { new: true }
  ).select("healthProfile");

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ healthProfile: user.healthProfile });
}

const VALID_LANGUAGES = ["en", "hi"];

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { language } = await req.json();
  if (!VALID_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(userId, { $set: { language } }, { new: true }).select(
    "language"
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ language: user.language });
}
