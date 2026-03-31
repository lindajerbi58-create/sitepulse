import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/task";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectDB();

    const { id } = await context.params;

    const task = await Task.findById(id);

    if (!task) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connectDB();

    const { id } = await context.params;
    const body = await req.json();

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.parentId !== undefined) updateData.parentId = body.parentId;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
    if (body.createdById !== undefined) updateData.createdById = body.createdById;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;

    if (body.progress !== undefined) {
      const numericProgress = Number(body.progress);
      updateData.progress = Math.max(0, Math.min(100, numericProgress));
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    await connectDB();

    const { id } = await context.params;

    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}