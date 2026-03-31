import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Issue from "@/models/issue";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    const { id } = await context.params;
    const body = await req.json();

    const updated = await Issue.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { message: "Issue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /api/issues/[id] error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update issue" },
      { status: 500 }
    );
  }
}