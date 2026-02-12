import mongoose from "mongoose";

const IssueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,

  taskId: { type: String, required: true },
  projectId: { type: String, required: true },

  ownerId: { type: String, required: true },

  category: String,
  dueDate: String,

  status: {
    type: String,
    enum: ["Open", "Resolved"],
    default: "Open",
  },

  resolvedAt: String,

  createdAt: { type: String, required: true },
});

export default mongoose.models.Issue ||
  mongoose.model("Issue", IssueSchema);
