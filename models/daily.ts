import mongoose from "mongoose";

const DailySchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true },
    userId: { type: String, required: true },
    projectId: { type: String, required: true },
    date: { type: String, required: true },
    qualityLevel: { type: String, enum: ["Very Good", "Medium", "Low"], default: "Medium" },
    targetQuantity: { type: Number, required: true },
    actualQuantity: { type: Number, required: true },
    comment: String,
    delayReasons: [String],
    createdAt: { type: String, required: true },
  },
);

export default mongoose.models.Daily ||
  mongoose.model("Daily", DailySchema);
