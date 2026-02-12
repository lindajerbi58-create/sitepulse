"use client";

import { useState, useEffect } from "react";
import { useDailyReportStore } from "@/store/useDailyReportStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useUserStore } from "@/store/useUserStore";
import { canAssign } from "@/lib/hierarchy";
import Link from "next/link";

export default function DailyReportsPage() {
  const { reports } = useDailyReportStore();
  const { tasks } = useTaskStore();

  const currentUser = useUserStore((state) => state.currentUser);
  const users = useUserStore((state) => state.users);
  const currentUserId = currentUser?._id;

  const [backendReports, setBackendReports] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<
    "my" | "team" | "all"
  >("team");

  // 🔥 FETCH BACKEND DAILY
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/daily");
        const data = await res.json();
        setBackendReports(data);
      } catch (err) {
        console.error("Failed to fetch daily reports", err);
      }
    };

    fetchReports();
  }, []);

  // 🔥 MERGE LOCAL + BACKEND
  const allReports = [
    ...reports,
    ...backendReports.map((r) => ({
      id: r._id,
      taskId: r.taskId || "",
      userId: r.user?._id,
      date: r.date,
      targetQuantity: 0,
      actualQuantity: 0,
      delayReasons: [],
      comment: r.workDone,
    })),
  ];

  if (!currentUserId) return null;

  const visibleReports = allReports.filter((report) =>
    canAssign(currentUserId, report.userId, users)
  );

  let filteredReports = visibleReports;

  if (filterMode === "my") {
    filteredReports = visibleReports.filter(
      (r) => r.userId === currentUserId
    );
  }

  if (filterMode === "team") {
    filteredReports = visibleReports.filter(
      (r) => r.userId !== currentUserId
    );
  }

  const performanceReports = filteredReports.filter(
    (r) => r.targetQuantity > 0
  );

  const averagePerformance =
    performanceReports.length > 0
      ? (
          performanceReports.reduce(
            (acc, r) =>
              acc + (r.actualQuantity / r.targetQuantity) * 100,
            0
          ) / performanceReports.length
        ).toFixed(1)
      : "N/A";

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">
          Daily Reports
        </h1>

        <div className="flex gap-4">
          <select
            value={filterMode}
            onChange={(e) =>
              setFilterMode(e.target.value as any)
            }
            className="bg-[#1f2937] px-4 py-2 rounded-lg"
          >
            <option value="my">My Reports</option>
            <option value="team">My Team</option>
            <option value="all">All Visible</option>
          </select>

          <Link
            href="/daily/new"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
          >
            + New Report
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-8 bg-[#111827] p-6 rounded-2xl border border-gray-800">
        <h2 className="text-lg font-semibold mb-2">
          Team Performance
        </h2>
        <p className="text-3xl font-bold text-blue-400">
          {averagePerformance}%
        </p>
      </div>

      <div className="space-y-6">
        {filteredReports.map((report) => {
          const task = tasks.find(
            (t) => t.id === report.taskId
          );
          const user = users.find(
            (u) => u._id === report.userId
          );

          const isQuantitative =
            report.targetQuantity > 0;

          const isSubordinate =
            report.userId !== currentUserId;

          return (
            <div
              key={report.id}
              className="bg-[#111827] border border-gray-800 p-5 rounded-2xl shadow-lg"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  {task?.title || "Backend Report"}
                </h2>

                {isSubordinate && (
                  <span className="bg-purple-600/20 text-purple-400 px-3 py-1 text-xs rounded-full">
                    From Subordinate
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-400 mt-1">
                By: {user?.fullName || "Backend User"}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Date:{" "}
                {new Date(
                  report.date
                ).toLocaleDateString()}
              </p>

              {isQuantitative ? (
                <div className="mt-3">
                  <p>Target: {report.targetQuantity}</p>
                  <p>Actual: {report.actualQuantity}</p>
                </div>
              ) : (
                <p className="mt-3 text-gray-300">
                  Comment: {report.comment}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
