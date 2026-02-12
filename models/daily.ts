import mongoose from "mongoose";

const DailySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    workDone: {
      type: String,
      required: true,
    },
    issues: {
      type: String,
    },
    plansTomorrow: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Daily ||
  mongoose.model("Daily", DailySchema);
