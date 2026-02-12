"use client";

import { useEffect } from "react";
import { useProcurementStore } from "@/store/useProcurementStore";
import { useUserStore } from "@/store/useUserStore";
import { useTaskStore } from "@/store/useTaskStore";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function ProcurementPage() {
  const {
    items,
    updateItem,
    budgetLimit,
    setItems, // 🔥 ajouté
  } = useProcurementStore();

  const { users } = useUserStore();
  const { tasks } = useTaskStore();

  const today = new Date();

  /* ===============================
     🔥 FETCH PROCUREMENT FROM API
  =============================== */
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch("/api/procurement");
        if (res.ok) {
          const data = await res.json();
          setItems(data); // hydrate Zustand
        }
      } catch (err) {
        console.error("Procurement fetch failed", err);
      }
    };

    fetchItems();
  }, []);

  /* ===============================
     💰 TOTAL SPENT
  =============================== */
  const totalSpent = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );

  const budgetUsage =
    budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;

  const highPriorityCount = items.filter(
    (i) => i.priority === "High" && i.status !== "En Cours"
  ).length;

  const overdueCount = items.filter(
    (i) =>
      new Date(i.expectedDate) < today &&
      i.status !== "En Cours"
  ).length;

  const supplyRiskScore =
    highPriorityCount * 15 +
    overdueCount * 10 +
    budgetUsage / 5;

  const pendingValue = items
    .filter((i) => i.status !== "En Cours")
    .reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );

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

  /* ===============================
     UI
  =============================== */

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">
          Global Procurement Control
        </h1>

        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="bg-gray-600 px-4 py-2 rounded-lg"
          >
            Back
          </Link>

          <Link
            href="/procurement/new"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
          >
            + New Order
          </Link>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid md:grid-cols-4 gap-6 mb-10">

        <Kpi
          title="Budget Limit"
          value={`$${budgetLimit.toFixed(0)}`}
          color="blue"
        />

        <Kpi
          title="Total Spent"
          value={`$${totalSpent.toFixed(0)}`}
          color="blue"
        />

        <Kpi
          title="Pending Value"
          value={`$${pendingValue.toFixed(0)}`}
          color="yellow"
        />

        <Kpi
          title="Remaining Budget"
          value={`$${(
            chartData.length > 0
              ? chartData[chartData.length - 1].remaining
              : budgetLimit
          ).toFixed(0)}`}
          color="red"
        />

        <Kpi
          title="Supply Risk Score"
          value={Math.round(supplyRiskScore)}
          color={
            supplyRiskScore > 80
              ? "red"
              : supplyRiskScore > 40
              ? "yellow"
              : "green"
          }
        />
      </div>

      {/* PROCUREMENT LIST */}
      <div className="space-y-6">
        {items.map((item) => {
          const isLate =
            new Date(item.expectedDate) < today &&
            item.status !== "En Cours";

          return (
            <div
              key={item.id}
              className={`bg-[#111827] p-6 rounded-2xl border shadow-lg ${
                isLate
                  ? "border-red-600"
                  : "border-gray-800"
              }`}
            >
              <h2 className="text-xl font-bold">
                {item.title}
              </h2>

              <p className="text-blue-400 mt-2 font-bold">
                Total: $
                {(item.quantity * item.unitCost).toFixed(0)}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={async () => {
                    updateItem(item.id, {
                      status: "En Cours",
                    });

                    // 🔥 Backend sync
                    await fetch(`/api/procurement/${item.id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        status: "En Cours",
                      }),
                    });
                  }}
                  className="bg-blue-600 px-3 py-1 rounded-md text-sm"
                >
                  En Cours
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* KPI COMPONENT */
function Kpi({ title, value, color }: any) {
  const colors: any = {
    blue: "border-blue-500 text-blue-400",
    yellow: "border-yellow-500 text-yellow-400",
    red: "border-red-500 text-red-400",
    green: "border-green-500 text-green-400",
  };

  return (
    <div
      className={`bg-[#111827] p-6 rounded-2xl border ${colors[color]} shadow-xl`}
    >
      <p className="text-gray-400 text-sm">{title}</p>
      <h2 className="text-2xl font-bold mt-2">
        {value}
      </h2>
    </div>
  );
}
