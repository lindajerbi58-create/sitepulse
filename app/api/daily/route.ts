import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import DailyReportSubmission from "../../../models/DailyReportSubmission";

export async function GET() {
  try {
    await connectDB();

    const reports = await DailyReportSubmission.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(reports);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}