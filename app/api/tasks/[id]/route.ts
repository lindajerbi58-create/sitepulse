import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/task";
import { NextRequest } from "next/server";
import Notification from "@/models/Notification";
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const task = await Task.findById(params.id);

  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await req.json();

    const updatedTask = await Task.findByIdAndUpdate(
      params.id,
      body,
      { new: true }
    );

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

const normalizeId = (value: any) =>
  String(value?._id || value?.id || value || "");

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await req.json();
    const taskId = params.id;

    const existingTask = await Task.findById(taskId);

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const oldProgress = Number(existingTask.progress || 0);
    const newProgress = Number(
      body.progress !== undefined ? body.progress : oldProgress
    );

    const updatedTask = await Task.findByIdAndUpdate(taskId, body, {
      new: true,
    });

    const assigneeId = normalizeId(existingTask.assigneeId);
    const creatorId = normalizeId(existingTask.createdById);
    const actorId = String(body.updatedById || "");

    const progressChanged = oldProgress !== newProgress;

    if (
      progressChanged &&
      actorId &&
      actorId === assigneeId &&
      creatorId &&
      creatorId !== actorId
    ) {
      await Notification.create({
        userId: creatorId,
        taskId: String(updatedTask._id),
        senderId: actorId,
        type: "task_progress_updated",
        title: "Task progress updated",
        message: `Progress for "${updatedTask.title}" changed from ${oldProgress}% to ${newProgress}%`,
        isRead: false,
        meta: {
          oldProgress,
          newProgress,
        },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("PUT /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();

  await Task.findByIdAndDelete(params.id);

  return NextResponse.json({ message: "Deleted" });
}
