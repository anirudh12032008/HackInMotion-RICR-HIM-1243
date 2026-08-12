import { Schema, models, model } from "mongoose";

const CommunityReportSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [] }, // [lng, lat]
    },
    type: {
      type: String,
      enum: ["smoke", "burning_waste", "industrial_emission", "dust_storm", "chemical_smell", "other"],
      required: true,
    },
    description: { type: String, maxlength: 500 },
    severity: { type: String, enum: ["low", "medium", "high"], required: true },
    upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    active: { type: Boolean, default: true },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CommunityReportSchema.pre("validate", function (this: any) {
  if (this.lat !== undefined && this.lng !== undefined) {
    this.location = { type: "Point", coordinates: [this.lng, this.lat] };
  }
});

CommunityReportSchema.index({ location: "2dsphere" });
CommunityReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.CommunityReport || model("CommunityReport", CommunityReportSchema);
