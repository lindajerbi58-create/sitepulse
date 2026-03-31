"use client";

import { useState, useEffect, useMemo } from "react";
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
  const currentUserId = currentUser?._id || "";

  const [backendReports, setBackendReports] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<"my" | "team" | "all">("team");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/daily", { cache: "no-store" });
        const data = await res.json();
        setBackendReports(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch daily reports", err);
      }
    };

    fetchReports();
  }, []);

  const normalizeId = (value: any) =>
    String(value?._id || value?.id || value || "");

  const safeDate = (value: any) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const allReports = useMemo(() => {
    const localReports = Array.isArray(reports) ? reports : [];

    const apiReports = Array.isArray(backendReports)
      ? backendReports.flatMap((r: any) => {
        const baseUserId = r.userId || "";
        const baseUserFullName = r.userFullName || "Unknown user";
        const baseDate =
          r.updatedAt ||
          r.createdAt ||
          r.reportDate ||
          new Date().toISOString();

        const entries = Array.isArray(r.entries) ? r.entries : [];

        return entries.map((entry: any, index: number) => {
          const modificationParts = [
            entry.workDescription,
            entry.comment,
            entry.progress != null ? `Progress: ${entry.progress}%` : null,
          ].filter(Boolean);

          return {
            id: `${r._id || "report"}-${index}`,
            taskId: entry.taskId || "",
            taskTitle: entry.taskTitle || "Task update",
            userId: baseUserId,
            userFullName: baseUserFullName,
            date: entry.timestamp || baseDate,
            modification: modificationParts.join(" — "),
            progress: entry.progress ?? null,
          };
        });
      })
      : [];

    const localMapped = localReports.map((r: any) => ({
      id: r.id || r._id,
      taskId: r.taskId || r.entry?.taskId || "",
      taskTitle: r.taskTitle || r.entry?.taskTitle || "Task update",
      userId: r.userId || r.user?._id || r.user?.id || "",
      userFullName: r.userFullName || r.user?.fullName || "",
      date:
        r.updatedAt ||
        r.createdAt ||
        r.date ||
        r.reportDate ||
        new Date().toISOString(),
      modification:
        [
          r.modification,
          r.comment,
          r.workDone,
          r.entry?.workDescription,
          r.entry?.comment,
          r.entry?.progress != null ? `Progress: ${r.entry.progress}%` : null,
        ]
          .filter(Boolean)
          .join(" — "),
      progress: r.progress ?? r.entry?.progress ?? null,
    }));

    const merged = [...localMapped, ...apiReports];

    const cleaned = merged.filter(
      (r) => r.modification && r.modification.trim() !== ""
    );

    const unique = cleaned.filter(
      (item, index, arr) =>
        index ===
        arr.findIndex(
          (x) =>
            String(x.id || "") === String(item.id || "") &&
            String(x.date || "") === String(item.date || "")
        )
    );

    return unique;
  }, [reports, backendReports]);

  if (!currentUserId) return null;

  const visibleReports = allReports.filter((report) =>
    canAssign(currentUserId, report.userId, users)
  );

  let filteredReports = visibleReports;

  if (filterMode === "my") {
    filteredReports = visibleReports.filter(
      (r) => normalizeId(r.userId) === String(currentUserId)
    );
  }

  if (filterMode === "team") {
    filteredReports = visibleReports.filter(
      (r) => normalizeId(r.userId) !== String(currentUserId)
    );
  }

  if (filterMode === "all") {
    filteredReports = visibleReports;
  }

  const last24hReports = filteredReports
    .filter((report) => {
      const d = safeDate(report.date);
      return d && d >= last24h && d <= now;
    })
    .sort((a, b) => {
      const aTime = safeDate(a.date)?.getTime() || 0;
      const bTime = safeDate(b.date)?.getTime() || 0;
      return bTime - aTime;
    });

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Daily Reports</h1>
          <p className="text-sm text-gray-400 mt-1">
            Last 24 hours changes
          </p>
        </div>

        <div className="flex gap-4">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="bg-[#1f2937] px-4 py-2 rounded-lg"
          >
            <option value="my">My Changes</option>
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

      <div className="mb-8 bg-[#111827] p-6 rounded-2xl border border-gray-800">
        <h2 className="text-lg font-semibold mb-2">Changes in last 24h</h2>
        <p className="text-3xl font-bold text-blue-400">
          {last24hReports.length}
        </p>
      </div>

      <div className="space-y-6">
        {last24hReports.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl text-gray-400">
            No changes found in the last 24 hours.
          </div>
        ) : (
          last24hReports.map((report) => {
            const task = tasks.find(
              (t: any) => normalizeId(t) === normalizeId(report.taskId)
            );

            const user = users.find(
              (u: any) => normalizeId(u) === normalizeId(report.userId)
            );

            return (
              <div
                key={`${report.id}-${report.date}`}
                className="bg-[#111827] border border-gray-800 p-5 rounded-2xl shadow-lg"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {report.taskTitle || task?.title || "Task update"}
                    </h2>

                    <p className="text-sm text-gray-400 mt-1">
                      Name:{" "}
                      {report.userFullName || user?.fullName || "Unknown user"}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      Date: {safeDate(report.date)?.toLocaleString() || "N/A"}
                    </p>

                    {report.progress !== null && report.progress !== undefined && (
                      <p className="text-sm text-blue-400 mt-1">
                        Progress: {report.progress}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-1">Modification</p>
                  <div className="bg-[#0b1220] border border-gray-700 rounded-xl p-4 text-gray-200">
                    {report.modification}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}