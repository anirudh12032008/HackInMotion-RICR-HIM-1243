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

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    healthProfile: { type: HealthProfileSchema, default: () => ({}) },
    language: { type: String, default: "en" },
    savedLocations: [{ type: Schema.Types.ObjectId, ref: "Location" }],
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);
