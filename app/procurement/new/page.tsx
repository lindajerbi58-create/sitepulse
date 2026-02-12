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
import { useEffect } from "react";

export default function ExecutiveView() {
  const { items, budgetLimit } = useProcurementStore();
  const { tasks } = useTaskStore();
  const { issues } = useIssueStore();
  const { reports } = useDailyReportStore();

  const sortedItems = [...items].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
  );

  let cumulativeSpent = 0;

  const chartData = sortedItems.map((item) => {
    cumulativeSpent += item.quantity * item.unitCost;
const { setItems, setBudgetLimit } = useProcurementStore();

useEffect(() => {
  const fetchProcurement = async () => {
    try {
      const res = await fetch("/api/procurement");
      const data = await res.json();

      if (data.items) {
        setItems(data.items);
      }

      if (data.budgetLimit) {
        setBudgetLimit(data.budgetLimit);
      }

    } catch (error) {
      console.error("Procurement API failed", error);
    }
  };

  fetchProcurement();
}, []);

    return {
      date: new Date(item.createdAt).toLocaleDateString(),
      budgetMax: budgetLimit,
      remaining: Math.max(budgetLimit - cumulativeSpent, 0),
    };
  });

  if (chartData.length === 0) {
    chartData.push({
      date: new Date().toLocaleDateString(),
      budgetMax: budgetLimit,
      remaining: budgetLimit,
    });
  }

  // 🔥 Définir remaining AVANT de l'utiliser
  const remaining =
    chartData[chartData.length - 1].remaining;

  const totalSpent = budgetLimit - remaining;

  const burnRate =
    sortedItems.length > 0
      ? totalSpent / sortedItems.length
      : 0;

  const estimatedOrdersLeft =
    burnRate > 0 ? remaining / burnRate : 0;

  const estimatedDepletion =
    burnRate > 0
      ? `${Math.round(estimatedOrdersLeft)} orders remaining`
      : "Stable spending";

  const riskLevel =
    remaining < budgetLimit * 0.2
      ? "Critical"
      : remaining < budgetLimit * 0.4
      ? "Warning"
      : "Healthy";

  // 📊 Performance moyenne
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

  // 🚨 Issues ouvertes
  const openIssues = issues.filter(
    (i) => i.status === "Open"
  ).length;

  // ⏳ Tâches en retard
  const today = new Date();
  const delayedTasks = tasks.filter(
    (t) =>
      new Date(t.dueDate) < today &&
      (t.progress ?? 0) < 100
  ).length;

  // 💰 Risk financier
  const riskScore =
    remaining < budgetLimit * 0.2
      ? 80
      : remaining < budgetLimit * 0.4
      ? 50
      : 20;

  // 📦 Supply Risk
  const supplyRiskScore = items.filter(
    (i) => i.status !== "Delivered"
  ).length * 5;

  // 🔥 HEALTH SCORE
  const healthScore = calculateHealthScore({
    avgPerformance: Number(avgPerformance),
    openIssues,
    delayedTasks,
    financialRisk: riskScore,
    supplyRisk: supplyRiskScore,
  });

  // 🔥 Category Spending
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

  // 🔥 Projection
  const projectionData = [...chartData];

  if (burnRate > 0) {
    let projectedRemaining = remaining;

    for (let i = 1; i <= 5; i++) {
      projectedRemaining -= burnRate;

      projectionData.push({
        date: `+${i}`,
        budgetMax: budgetLimit,
        remaining: Math.max(projectedRemaining, 0),
      });
    }
  }

  // 🔥 Anomaly detection
  const anomaly = items.some(
    (i) =>
      i.quantity * i.unitCost >
      budgetLimit * 0.25
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

      {/* 🔥 Health Score */}
      <div className="text-4xl font-bold mb-6">
        Health Score: {healthScore}/100
      </div>

      {/* 🔥 Global Status Badge */}
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

      {/* KPI ROW */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <Kpi title="Total Budget" value={`$${budgetLimit.toFixed(0)}`} />
        <Kpi title="Total Spent" value={`$${totalSpent.toFixed(0)}`} />
        <Kpi title="Remaining" value={`$${remaining.toFixed(0)}`} />
        <Kpi title="Burn Rate" value={`$${burnRate.toFixed(0)} / order`} />
        <Kpi
          title="Spending Velocity"
          value={`$${(
            totalSpent /
            (sortedItems.length || 1)
          ).toFixed(0)} avg/order`}
        />
      </div>

      {/* Projection */}
      <div className="bg-indigo-600/20 border border-indigo-500 p-5 rounded-xl mb-8">
        📅 Projection: {estimatedDepletion}
      </div>

      {/* Risk */}
      <div
        className={`mb-8 p-5 rounded-xl font-bold text-center ${
          riskLevel === "Critical"
            ? "bg-red-600/20 text-red-400 border border-red-500"
            : riskLevel === "Warning"
            ? "bg-yellow-600/20 text-yellow-400 border border-yellow-500"
            : "bg-green-600/20 text-green-400 border border-green-500"
        }`}
      >
        Risk Status: {riskLevel}
      </div>

      {/* Chart */}
      <div className="bg-[#111827] p-6 rounded-xl shadow-lg">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={projectionData}>
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />

            <Area
              type="monotone"
              dataKey="remaining"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.15}
            />

            <Line
              type="monotone"
              dataKey="budgetMax"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="remaining"
              stroke="#f97316"
              strokeDasharray="5 5"
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="remaining"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4 }}
              isAnimationActive
              animationDuration={1200}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-8 bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-6 rounded-xl border border-purple-500">
          <h3 className="font-bold mb-2">
            AI Executive Analysis
          </h3>
          <p className="text-gray-300">
            {executiveSummary}
          </p>
        </div>
      </div>

      {/* Pie */}
      <div className="mt-12 bg-[#111827] p-6 rounded-xl shadow-lg">
        <h2 className="text-lg font-bold mb-4">
          Spending by Category
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              label
            >
              {categoryData.map((_, index) => (
                <Cell
                  key={index}
                  fill={
                    COLORS[
                      index % COLORS.length
                    ]
                  }
                />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-8 bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-lg shadow-lg"
      >
        Export Executive Report (PDF)
      </button>
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
