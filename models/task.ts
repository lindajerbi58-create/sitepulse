import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,

  projectId: { type: String, required: true },

  assigneeId: { type: String, required: true },
  createdById: { type: String, required: true },

  dueDate: { type: String, required: true },

  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },

  status: {
    type: String,
    enum: [
      "Not Started",
      "In Progress",
      "On Hold",
      "Complete",
    ],
    default: "Not Started",
  },

  totalTarget: Number,
  progress: Number,

  parentId: String,

  createdAt: { type: String, required: true },
});

export default mongoose.models.Task ||
  mongoose.model("Task", TaskSchema);
