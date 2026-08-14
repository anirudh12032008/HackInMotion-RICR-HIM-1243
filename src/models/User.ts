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

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    healthProfile: { type: HealthProfileSchema, default: () => ({}) },
    language: { type: String, default: "en" },
    savedLocations: [{ type: Schema.Types.ObjectId, ref: "Location" }],
    // One entry per subscribed browser/device — a user can have several.
    pushSubscriptions: { type: [PushSubscriptionSchema], default: [] },
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
