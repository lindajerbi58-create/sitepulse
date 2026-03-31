import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Issue from "@/models/issue";

export async function GET() {
  try {
    await connectDB();

    const issues = await Issue.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json(issues);
  } catch (error: any) {
    console.error("GET /api/issues error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch issues" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      title,
      description,
      category,
      customCategory,
      priority,
      taskId,
      projectId,
      createdById,
      ownerId,
      dueDate,
    } = body;

    if (
      !title ||
      !description ||
      !category ||
      !taskId ||
      !projectId ||
      !createdById ||
      !dueDate
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const newIssue = await Issue.create({
      title: String(title),
      description: String(description),
      category: String(category),
      customCategory: String(customCategory || ""),
      priority: ["Low", "Medium", "High"].includes(priority)
        ? priority
        : "Medium",
      status: "Open",
      taskId: String(taskId),
      projectId: String(projectId),
      createdById: String(createdById),
      ownerId: String(ownerId || ""),
      dueDate: String(dueDate),
      resolvedAt: "",
      resolutionNote: "",
    });

    return NextResponse.json(newIssue, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/issues error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create issue" },
      { status: 500 }
    );
  }
}