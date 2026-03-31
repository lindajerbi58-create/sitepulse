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
      return NextResponse.json({ message: "userId and date required" }, { status: 400 });
    }

    const report = await DailyReportSubmission.findOne({ userId, reportDate: date });
    return NextResponse.json(report || null);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, reportDate, action, entry, generalComment, isSent, superiorEmail, superiorId, userFullName, userRole } = body;

    if (!userId || !reportDate) {
      return NextResponse.json({ message: "userId and reportDate required" }, { status: 400 });
    }

    let report = await DailyReportSubmission.findOne({ userId, reportDate });

    if (!report) {
      report = new DailyReportSubmission({
        userId,
        reportDate,
        userFullName: userFullName || "",
        userRole: userRole || "",
        entries: [],
      });
    }

    if (action === "ADD_ENTRY" && entry) {
      const existingEntryIndex = report.entries.findIndex((e: any) => e.taskId === entry.taskId);
      if (existingEntryIndex > -1) {
        report.entries[existingEntryIndex] = { ...report.entries[existingEntryIndex], ...entry, timestamp: new Date().toISOString() };
      } else {
        report.entries.push({ ...entry, timestamp: new Date().toISOString() });
      }
    } else if (action === "UPDATE_REPORT") {
      if (generalComment !== undefined) report.generalComment = generalComment;
      if (isSent !== undefined) report.isSent = isSent;
      if (superiorEmail !== undefined) report.superiorEmail = superiorEmail;
      if (superiorId !== undefined) report.superiorId = superiorId;
      if (userFullName !== undefined) report.userFullName = userFullName;
      if (userRole !== undefined) report.userRole = userRole;
    }

    await report.save();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
