import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/project";

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