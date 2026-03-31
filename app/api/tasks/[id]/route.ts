import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/task";
import DailyReportSubmission from "@/models/DailyReportSubmission";

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
    console.log("PATCH BODY =", body);
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
    console.log("UPDATED TASK =", {
      id: String(updatedTask._id || ""),
      title: updatedTask.title,
      assigneeId: updatedTask.assigneeId,
      progress: updatedTask.progress,
      status: updatedTask.status,
    });

    if (body.progress !== undefined || body.status !== undefined) {
      const today = new Date().toISOString().split("T")[0];

      const assigneeId = String(
        (updatedTask as any).assigneeId?._id ||
        (updatedTask as any).assigneeId?.id ||
        updatedTask.assigneeId ||
        ""
      );

      if (assigneeId) {
        console.log("DAILY DEBUG =", {
          today,
          assigneeId,
          willCreateDaily: !!assigneeId,
        });
        console.log("DAILY DEBUG =", {
          today,
          assigneeId,
          willCreateDaily: !!assigneeId,
        });
        let report = await DailyReportSubmission.findOne({
          userId: assigneeId,
          reportDate: today,
        });

        if (!report) {
          report = new DailyReportSubmission({
            userId: assigneeId,
            reportDate: today,
            userFullName: "Unknown user",
            userRole: "Unknown role",
            entries: [],
          });
        }

        const taskId = String(updatedTask._id || "");
        const existingEntryIndex = report.entries.findIndex(
          (e: any) => String(e.taskId || "") === taskId
        );

        const entry = {
          taskId,
          taskTitle: updatedTask.title || "Untitled task",
          progress: Number(
            body.progress !== undefined
              ? body.progress
              : (updatedTask as any).progress || 0
          ),
          workDescription: "Updated progress",
          comment:
            body.status !== undefined
              ? `Status: ${body.status}`
              : "",
          timestamp: new Date().toISOString(),
        };

        if (existingEntryIndex > -1) {
          report.entries[existingEntryIndex] = {
            ...report.entries[existingEntryIndex],
            ...entry,
          };
        } else {
          report.entries.push(entry);
        }

        await report.save();
        console.log("DAILY REPORT SAVED");
        console.log("DAILY REPORT UPDATED", {
          userId: assigneeId,
          reportDate: today,
          taskId,
          progress: entry.progress,
        });
      }
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