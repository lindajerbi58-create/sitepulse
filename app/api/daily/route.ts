import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import DailyReportSubmission from "../../../models/DailyReportSubmission";

export async function GET() {
  console.log("========== GET /api/daily START ==========");
  try {
    await connectDB();
    console.log("Mongo connected for GET /api/daily");

    const reports = await DailyReportSubmission.find()
      .sort({ createdAt: -1 })
      .lean();

    console.log("reports from DB =", reports);
    console.log("reports count =", reports.length);
    console.log("========== GET /api/daily SUCCESS ==========");

    return NextResponse.json(reports);
  } catch (error: any) {
    console.error("GET /api/daily ERROR =", error);
    return NextResponse.json(
      { message: error.message || "Failed to load daily reports" },
      { status: 500 }
    );
  }
}