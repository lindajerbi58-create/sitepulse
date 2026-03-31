import mongoose, { Schema, models } from "mongoose";

const ProcurementSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    projectId: { type: String, default: "" },

    title: { type: String, required: true },
    supplier: { type: String, default: "" },
    category: { type: String, default: "Other" },

    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },

    expectedDate: { type: String, required: true },
    priority: { type: String, default: "Medium" },

    // Pending Confirmation / Confirmed / Cancelled / Delivered
    status: { type: String, default: "Pending Confirmation" },

    note: { type: String, default: "" },

    createdAt: { type: String, required: true },
    updatedAt: { type: String, default: "" },
  },
  { versionKey: false }
);

const Procurement =
  models.Procurement || mongoose.model("Procurement", ProcurementSchema);

export default Procurement;