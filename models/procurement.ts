import mongoose, { Schema, models } from "mongoose";

const ProcurementSchema = new Schema(
  {
    id: { type: String, required: true, unique: true }, // uuid côté front
    projectId: { type: String, default: "" }, // si tu veux multi-project
    title: { type: String, required: true },
    supplier: { type: String, default: "" },
    category: { type: String, default: "Other" },

    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },

    expectedDate: { type: String, required: true }, // ISO string
    priority: { type: String, default: "Medium" }, // Low/Medium/High
    status: { type: String, default: "Pending" }, // ex: Pending / En Cours / Delivered

    createdAt: { type: String, required: true }, // ISO string
  },
  { versionKey: false }
);

const Procurement =
  models.Procurement || mongoose.model("Procurement", ProcurementSchema);

export default Procurement;
