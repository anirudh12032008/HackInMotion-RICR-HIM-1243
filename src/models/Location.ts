import { Schema, models, model } from "mongoose";

const LocationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    city: { type: String },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    alertThreshold: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LocationSchema.index({ userId: 1 });

export default models.Location || model("Location", LocationSchema);
