import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/task";
import Issue from "@/models/issue";
import Daily from "@/models/daily";
import Procurement from "@/models/procurement";

export async function GET() {
  try {
    await connectDB();

    const tasks = await Task.find();
    const issues = await Issue.find();
    const reports = await Daily.find();
    const items = await Procurement.find();

    const budgetLimit = 100000; // 🔥 ou récupère depuis DB si stocké

    // 🔹 Budget calc
    let totalSpent = 0;

   type ProcurementItem = {
  quantity: number;
  unitCost: number;
};

items.forEach((item: ProcurementItem) => {
  totalSpent += item.quantity * item.unitCost;
});


    const remaining = Math.max(budgetLimit - totalSpent, 0);

    const burnRate =
      items.length > 0 ? totalSpent / items.length : 0;

    const quantitativeReports = reports.filter(
      (r) => r.targetQuantity > 0
    );

    const avgPerformance =
      quantitativeReports.length > 0
        ? quantitativeReports.reduce((sum, r) => {
            return (
              sum +
              (r.actualQuantity / r.targetQuantity) * 100
            );
          }, 0) / quantitativeReports.length
        : 100;

    const openIssues = issues.filter(
      (i) => i.status === "Open"
    ).length;

    const today = new Date();

    const delayedTasks = tasks.filter(
      (t) =>
        new Date(t.dueDate) < today &&
        t.status !== "Complete"
    ).length;

    const financialRisk =
      remaining < budgetLimit * 0.2
        ? 80
        : remaining < budgetLimit * 0.4
        ? 50
        : 20;

    const supplyRisk =
    items.filter((i: ProcurementItem & { status: string }) =>
  i.status !== "Delivered"
)

        .length * 5;

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          openIssues * 3 -
          delayedTasks * 5 -
          financialRisk * 0.3 -
          supplyRisk * 0.2 +
          avgPerformance * 0.2
      )
    );

    return NextResponse.json({
      budgetLimit,
      totalSpent,
      remaining,
      burnRate,
      avgPerformance,
      openIssues,
      delayedTasks,
      healthScore,
      financialRisk,
      supplyRisk,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
