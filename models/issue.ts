import mongoose, { Schema, models, model } from "mongoose";

const IssueSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    category: { type: String, required: true, trim: true },
    customCategory: { type: String, default: "", trim: true },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Open", "Resolved"],
      default: "Open",
    },

    taskId: { type: String, required: true },
    projectId: { type: String, required: true },

    createdById: { type: String, required: true },
    ownerId: { type: String, default: "" },

    dueDate: { type: String, required: true },
    resolvedAt: { type: String, default: "" },
    resolutionNote: { type: String, default: "" },
  },
  { timestamps: true }
);

export default models.Issue || model("Issue", IssueSchema);