import { NextRequest, NextResponse } from "next/server";
import Notification from "@/models/Notification";
import { connectDB } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    console.log("notification body =", body);

    const senderId = String(body.senderId || "");


    if (!body.userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (!senderId) {
      return NextResponse.json(
        { error: "senderId is required" },
        { status: 400 }
      );
    }

    const notification = await Notification.create({
      userId: String(body.userId || ""),
      taskId: String(body.taskId || ""),
      senderId,
      type: String(body.type || "task_progress_updated"),
      title: String(body.title || "Notification"),
      message: String(body.message || ""),
      isRead: false,
      meta: body.meta || {},
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}