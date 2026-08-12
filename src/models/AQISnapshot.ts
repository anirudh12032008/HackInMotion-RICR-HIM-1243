import { Schema, models, model } from "mongoose";

const PollutantsSchema = new Schema(
  {
    pm25: Number,
    pm10: Number,
    o3: Number,
    no2: Number,
    so2: Number,
    co: Number,
  },
  { _id: false }
);

const ForecastDaySchema = new Schema(
  {
    day: { type: Date, required: true },
    avg: Number,
    min: Number,
    max: Number,
  },
  { _id: false }
);

const AQISnapshotSchema = new Schema({
  locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  aqi: { type: Number, required: true },
  dominantPollutant: { type: String },
  pollutants: { type: PollutantsSchema, default: () => ({}) },
  forecast: [ForecastDaySchema],
  source: { type: String, default: "waqi" },
});

AQISnapshotSchema.index({ locationId: 1, timestamp: -1 });

export default models.AQISnapshot || model("AQISnapshot", AQISnapshotSchema);
