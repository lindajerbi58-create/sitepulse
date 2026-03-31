import mongoose from "mongoose";

const DailyReportEntrySchema = new mongoose.Schema(
  {
    taskId: { type: String, default: "" },
    taskTitle: { type: String, default: "Task update" },
    progress: { type: Number, default: null },
    workDescription: { type: String, default: "" },
    comment: { type: String, default: "" },
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const DailyReportSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userFullName: { type: String, default: "Unknown user" },
    userRole: { type: String, default: "" },
    reportDate: { type: String, required: true },
    entries: { type: [DailyReportEntrySchema], default: [] },
    generalComment: { type: String, default: "" },
    superiorEmail: { type: String, default: "" },
    superiorId: { type: String, default: "" },
    isSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DailyReportSubmissionSchema.index(
  { userId: 1, reportDate: 1 },
  { unique: true }
);

const DailyReportSubmission =
  mongoose.models.DailyReportSubmission ||
  mongoose.model("DailyReportSubmission", DailyReportSubmissionSchema);

export default DailyReportSubmission;