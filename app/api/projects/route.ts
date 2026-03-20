import { NextResponse } from "next/server";
import mongoose, { Schema, model, models } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in environment variables");
}

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGODB_URI);
}

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Planning", "Active", "On Hold", "Completed"],
      default: "Active",
    },
    createdById: { type: String, default: "" },
    managerId: { type: String, default: "" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const Project = models.Project || model("Project", ProjectSchema);

export async function GET() {
  try {
    await connectDB();

    const projects = await Project.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json(projects, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();
    const status = String(body?.status || "Active");
    const createdById = String(body?.createdById || "");
    const managerId = String(body?.managerId || "");
    const startDate = body?.startDate ? new Date(body.startDate) : null;
    const endDate = body?.endDate ? new Date(body.endDate) : null;

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const newProject = await Project.create({
      name,
      description,
      status,
      createdById,
      managerId,
      startDate,
      endDate,
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create project" },
      { status: 500 }
    );
  }
}