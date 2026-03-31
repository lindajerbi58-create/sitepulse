import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DailyReportSubmission from "@/models/DailyReportSubmission";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!userId || !date) {
      return NextResponse.json(
        { message: "userId and date required" },
        { status: 400 }
      );
    }

    const report = await DailyReportSubmission.findOne({
      userId: String(userId),
      reportDate: String(date),
    }).lean();

    return NextResponse.json(report || null);
  } catch (error: any) {
    console.error("GET /api/daily/report error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch daily report" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      userId,
      reportDate,
      action,
      entry,
      generalComment,
      isSent,
      superiorEmail,
      superiorId,
      userFullName,
      userRole,
    } = body;

    if (!userId || !reportDate) {
      return NextResponse.json(
        { message: "userId and reportDate required" },
        { status: 400 }
      );
    }

    let report = await DailyReportSubmission.findOne({
      userId: String(userId),
      reportDate: String(reportDate),
    });

    if (!report) {
      report = new DailyReportSubmission({
        userId: String(userId),
        reportDate: String(reportDate),
        userFullName: userFullName || "Unknown user",
        userRole: userRole || "",
        entries: [],
        generalComment: "",
        superiorEmail: "",
        superiorId: "",
        isSent: false,
      });
    }

    if (action === "ADD_ENTRY") {
      if (!entry || !entry.taskId) {
        return NextResponse.json(
          { message: "entry with taskId is required for ADD_ENTRY" },
          { status: 400 }
        );
      }

      const normalizedEntry = {
        taskId: String(entry.taskId || ""),
        taskTitle: String(entry.taskTitle || "Task update"),
        progress:
          entry.progress !== undefined && entry.progress !== null
            ? Number(entry.progress)
            : null,
        workDescription: String(entry.workDescription || ""),
        comment: String(entry.comment || ""),
        timestamp: entry.timestamp || new Date().toISOString(),
      };

      const existingEntryIndex = report.entries.findIndex(
        (e: any) => String(e.taskId) === String(normalizedEntry.taskId)
      );

      if (existingEntryIndex > -1) {
        report.entries[existingEntryIndex] = {
          ...report.entries[existingEntryIndex].toObject?.(),
          ...normalizedEntry,
        };
      } else {
        report.entries.push(normalizedEntry as any);
      }

      if (userFullName !== undefined) {
        report.userFullName = userFullName || report.userFullName || "Unknown user";
      }

      if (userRole !== undefined) {
        report.userRole = userRole || report.userRole || "";
      }
    } else if (action === "UPDATE_REPORT") {
      if (generalComment !== undefined) report.generalComment = generalComment;
      if (isSent !== undefined) report.isSent = Boolean(isSent);
      if (superiorEmail !== undefined) report.superiorEmail = superiorEmail;
      if (superiorId !== undefined) report.superiorId = superiorId;
      if (userFullName !== undefined) report.userFullName = userFullName;
      if (userRole !== undefined) report.userRole = userRole;
    } else {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      );
    }

    await report.save();

    console.log("Saved daily report:", {
      userId: report.userId,
      reportDate: report.reportDate,
      entriesCount: report.entries?.length || 0,
      entries: report.entries,
    });

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/daily/report error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to save daily report" },
      { status: 500 }
    );
  }
}