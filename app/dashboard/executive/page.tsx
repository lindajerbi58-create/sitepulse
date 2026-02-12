"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useTaskStore } from "../../../store/useTaskStore";
import { useIssueStore } from "../../../store/useIssueStore";
import { useDailyReportStore } from "../../../store/useDailyReportStore";
import { useProcurementStore } from "../../../store/useProcurementStore";
import { calculateHealthScore } from "@/lib/healthEngine";
import { useEffect, useState } from "react";

export default function ExecutiveView() {
  const { items, budgetLimit } = useProcurementStore();
  const { tasks } = useTaskStore();
  const { issues } = useIssueStore();
  const { reports } = useDailyReportStore();

  const [executiveData, setExecutiveData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard/executive");
        if (res.ok) {
          const data = await res.json();
          setExecutiveData(data);
        }
      } catch (err) {
        console.error("Executive API failed", err);
      }
    };

    fetchData();
  }, []);

  const sortedItems = [...items].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
  );

  let cumulativeSpent = 0;

  const chartData = sortedItems.map((item) => {
    cumulativeSpent += item.quantity * item.unitCost;

    return {
      date: new Date(item.createdAt).toLocaleDateString(),
      budgetMax:
        executiveData?.budgetLimit ?? budgetLimit,
      remaining: Math.max(
        (executiveData?.budgetLimit ?? budgetLimit) -
          cumulativeSpent,
        0
      ),
    };
  });

  if (chartData.length === 0) {
    chartData.push({
      date: new Date().toLocaleDateString(),
      budgetMax:
        executiveData?.budgetLimit ?? budgetLimit,
      remaining:
        executiveData?.remaining ??
        budgetLimit,
    });
  }

  const remaining =
    executiveData?.remaining ??
    chartData[chartData.length - 1].remaining;

  const totalSpent =
    executiveData?.totalSpent ??
    (budgetLimit - remaining);

  const burnRate =
    executiveData?.burnRate ??
    (sortedItems.length > 0
      ? totalSpent / sortedItems.length
      : 0);

  const estimatedOrdersLeft =
    burnRate > 0 ? remaining / burnRate : 0;

  const estimatedDepletion =
    burnRate > 0
      ? `${Math.round(estimatedOrdersLeft)} orders remaining`
      : "Stable spending";

  const riskLevel =
    remaining <
    (executiveData?.budgetLimit ?? budgetLimit) *
      0.2
      ? "Critical"
      : remaining <
        (executiveData?.budgetLimit ??
          budgetLimit) *
          0.4
      ? "Warning"
      : "Healthy";

  const avgPerformance =
    executiveData?.avgPerformance ?? 100;

  const openIssues =
    executiveData?.openIssues ??
    issues.filter((i) => i.status === "Open")
      .length;

  const delayedTasks =
    executiveData?.delayedTasks ??
    tasks.filter(
      (t) =>
        new Date(t.dueDate) < new Date() &&
        (t.progress ?? 0) < 100
    ).length;

  const riskScore =
    executiveData?.financialRisk ?? 20;

  const supplyRiskScore =
    executiveData?.supplyRisk ??
    items.filter(
      (i) => i.status !== "Delivered"
    ).length * 5;

  const healthScore =
    executiveData?.healthScore ??
    calculateHealthScore({
      avgPerformance: Number(avgPerformance),
      openIssues,
      delayedTasks,
      financialRisk: riskScore,
      supplyRisk: supplyRiskScore,
    });

  const categoryMap: Record<string, number> = {};

  items.forEach((item) => {
    const cost = item.quantity * item.unitCost;
    const category = item.category || "Other";
    categoryMap[category] =
      (categoryMap[category] || 0) + cost;
  });

  const categoryData = Object.entries(categoryMap).map(
    ([name, value]) => ({
      name,
      value,
    })
  );

  const COLORS = [
    "#3b82f6",
    "#ef4444",
    "#22c55e",
    "#facc15",
    "#a855f7",
  ];

  const projectionData = [...chartData];

  if (burnRate > 0) {
    let projectedRemaining = remaining;

    for (let i = 1; i <= 5; i++) {
      projectedRemaining -= burnRate;

      projectionData.push({
        date: `+${i}`,
        budgetMax:
          executiveData?.budgetLimit ??
          budgetLimit,
        remaining: Math.max(
          projectedRemaining,
          0
        ),
      });
    }
  }

  const anomaly = items.some(
    (i) =>
      i.quantity * i.unitCost >
      (executiveData?.budgetLimit ??
        budgetLimit) *
        0.25
  );

  let executiveSummary =
    "Financial performance stable.";

  if (riskLevel === "Critical")
    executiveSummary =
      "Budget critical. Immediate cost restructuring required.";

  if (anomaly)
    executiveSummary +=
      " Large procurement anomaly detected.";

  return (
    <div className="p-10 text-white bg-[#0b1220] min-h-screen">

      <h1 className="text-3xl font-bold mb-4">
        Executive Financial Overview
      </h1>

      <div className="text-3xl font-bold mb-6">
        Health Score: {Math.round(healthScore)}/100
      </div>

      <div
        className={`inline-block px-4 py-2 rounded-full font-bold mb-6 ${
          riskLevel === "Critical"
            ? "bg-red-600 text-white"
            : riskLevel === "Warning"
            ? "bg-yellow-500 text-black"
            : "bg-green-600 text-white"
        }`}
      >
        Project Status: {riskLevel}
      </div>

      <div className="grid grid-cols-4 gap-6 mb-10">
        <Kpi
          title="Total Budget"
          value={`$${(
            executiveData?.budgetLimit ??
            budgetLimit
          ).toFixed(0)}`}
        />
        <Kpi
          title="Total Spent"
          value={`$${totalSpent.toFixed(0)}`}
        />
        <Kpi
          title="Remaining"
          value={`$${remaining.toFixed(0)}`}
        />
        <Kpi
          title="Burn Rate"
          value={`$${burnRate.toFixed(0)} / order`}
        />
      </div>

      <div className="bg-indigo-600/20 border border-indigo-500 p-5 rounded-xl mb-8">
        📅 Projection: {estimatedDepletion}
      </div>

      <div className="mt-8 bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-6 rounded-xl border border-purple-500">
        <h3 className="font-bold mb-2">
          AI Executive Analysis
        </h3>
        <p className="text-gray-300">
          {executiveSummary}
        </p>
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-[#111827] p-6 rounded-xl shadow-lg">
      <p className="text-gray-400 text-sm mb-2">
        {title}
      </p>
      <p className="text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}
