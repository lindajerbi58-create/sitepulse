import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/task";
import Issue from "@/models/issue";
import Daily from "@/models/daily";

export async function GET() {
  try {
    await connectDB();

    const today = new Date();

    const tasks = await Task.find();
    const issues = await Issue.find();
    const reports = await Daily.find();

    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
      (t) => t.status === "Complete"
    ).length;

    const openIssues = issues.filter(
      (i) => i.status === "Open"
    ).length;

    const delayedTasks = tasks.filter(
      (t) =>
        new Date(t.dueDate) < today &&
        t.status !== "Complete"
    ).length;

    const quantitativeReports = reports.filter(
      (r) => r.targetQuantity > 0
    );

    const avgPerformance =
      quantitativeReports.length > 0
        ? (
            quantitativeReports.reduce(
              (sum, r) =>
                sum +
                (r.actualQuantity / r.targetQuantity) * 100,
              0
            ) / quantitativeReports.length
          ).toFixed(1)
        : "0";

    const riskScore =
      openIssues * 5 +
      delayedTasks * 10 +
      (100 - Number(avgPerformance));

    return NextResponse.json({
      totalTasks,
      completedTasks,
      openIssues,
      delayedTasks,
      avgPerformance,
      riskScore,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
