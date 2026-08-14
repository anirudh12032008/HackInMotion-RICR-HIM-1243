import { Schema, models, model } from "mongoose";

const HealthProfileSchema = new Schema(
  {
    conditions: [
      {
        type: String,
        enum: ["asthma", "copd", "heartDisease", "allergies", "pregnancy", "elderly", "children"],
      },
    ],
    ageGroup: { type: String, enum: ["child", "adult", "senior"], default: "adult" },
    activityLevel: {
      type: String,
      enum: ["sedentary", "moderate", "active", "athlete"],
      default: "moderate",
    },
  },
  { _id: false }
);

const PushSubscriptionSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false }
);

// Every category defaults to true  push is opt-out, not opt-in, per
// category. Unset/older users read as "on" everywhere via `!== false`
// checks in lib/push.ts, so this default only matters for new documents.
const NotificationPreferencesSchema = new Schema(
  {
    thresholdAlerts: { type: Boolean, default: true },
    rapidChange: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: true },
    communityNearby: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Absent for accounts created via Google sign-in  those authenticate
    // entirely through the OAuth provider and never set a local password.
    password: { type: String },
    healthProfile: { type: HealthProfileSchema, default: () => ({}) },
    language: { type: String, default: "en" },
    savedLocations: [{ type: Schema.Types.ObjectId, ref: "Location" }],
    // One entry per subscribed browser/device  a user can have several.
    pushSubscriptions: { type: [PushSubscriptionSchema], default: [] },
    notificationPreferences: { type: NotificationPreferencesSchema, default: () => ({}) },
    // Opportunistic daily-summary throttle  same "no cron job" pattern
    // AQISnapshot uses for hourly snapshots (see lib/snapshot.ts).
    lastSummaryPushAt: { type: Date },
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
