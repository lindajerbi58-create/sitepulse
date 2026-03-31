import mongoose from "mongoose";

const DailyReportSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userFullName: { type: String, required: true },
    userRole: { type: String, required: true },
    reportDate: { type: String, required: true },
    entries: [
      {
        taskId: String,
        taskTitle: String,
        progress: Number,
        workDescription: String,
        comment: String,
        timestamp: String,
      },
    ],
    generalComment: { type: String, default: "" },
    superiorEmail: { type: String, default: "" },
    superiorId: { type: String, default: "" },
    isSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.DailyReportSubmission ||
  mongoose.model("DailyReportSubmission", DailyReportSubmissionSchema);
