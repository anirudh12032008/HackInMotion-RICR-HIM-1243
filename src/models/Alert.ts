import { Schema, models, model } from "mongoose";

const AlertSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    type: {
      type: String,
      enum: ["threshold_exceeded", "rapid_change", "forecast_warning"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "danger", "emergency"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    aqiValue: { type: Number, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AlertSchema.index({ userId: 1, read: 1, createdAt: -1 });
AlertSchema.index({ locationId: 1 });

export default models.Alert || model("Alert", AlertSchema);
