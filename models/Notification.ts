import mongoose, { Schema, models, model } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    taskId: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["task_progress_updated"],
      default: "task_progress_updated",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Notification =
  models.Notification || model("Notification", NotificationSchema);

export default Notification;