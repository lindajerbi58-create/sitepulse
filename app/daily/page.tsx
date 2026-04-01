"use client";

import { useState, useEffect, useMemo } from "react";
import { useDailyReportStore } from "@/store/useDailyReportStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useUserStore } from "@/store/useUserStore";
import { canAssign } from "@/lib/hierarchy";

import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
export default function DailyReportsPage() {
  const { reports } = useDailyReportStore();
  const { tasks } = useTaskStore();
const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const currentUser = useUserStore((state) => state.currentUser);
  const users = useUserStore((state) => state.users);
const [selectedDate, setSelectedDate] = useState("");
const currentUserId = String(currentUser?._id || "");
  const [backendReports, setBackendReports] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<"my" | "team" | "all">("all");
  console.log("currentUser =", currentUser);
console.log("currentUserId =", currentUserId);
console.log(
  "report userIds =",
  backendReports.map((r: any) => r.userId)
);
console.log(
  "users ids =",
  users.map((u: any) => String(u._id || u.id || ""))
);
  const exportDailyReportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Daily Reports", 14, 18);

    doc.setFontSize(11);
    doc.text("Last 24 hours changes", 14, 26);

    const rows = last24hReports.map((report) => {
      const user = users.find(
        (u: any) => normalizeId(u) === normalizeId(report.userId)
      );

      const displayName =
        report.userFullName && report.userFullName !== "Unknown user"
          ? report.userFullName
          : user?.fullName || "Unknown user";

      return [
        report.taskTitle || "Task update",
        displayName,
        safeDate(report.date)?.toLocaleString() || "N/A",
        report.progress != null ? `${report.progress}%` : "-",
        report.modification || "-",
      ];
    });

    autoTable(doc, {
      startY: 34,
      head: [["Task", "Name", "Date", "Progress", "Modification"]],
      body: rows,
      styles: {
        fontSize: 10,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: {
        fillColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 28 },
        2: { cellWidth: 38 },
        3: { cellWidth: 20 },
        4: { cellWidth: 65 },
      },
    });

    doc.save(`daily-reports-${new Date().toISOString().split("T")[0]}.pdf`);
  };
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

const visibleReports = allReports;

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
  if (selectedDate) {
  filteredReports = filteredReports.filter((r) => {
    const reportDate = safeDate(r.date);
    if (!reportDate) return false;

    const localYear = reportDate.getFullYear();
    const localMonth = String(reportDate.getMonth() + 1).padStart(2, "0");
    const localDay = String(reportDate.getDate()).padStart(2, "0");

    const formattedLocalDate = `${localYear}-${localMonth}-${localDay}`;

    return formattedLocalDate === selectedDate;
  });
}

console.log("currentUserId =", currentUserId);
console.log("allReports =", allReports);
console.log("visibleReports =", visibleReports);
console.log("filteredReports =", filteredReports);
const last24hReports = filteredReports;
console.log("last24hReports =", last24hReports);
  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Last Reports</h1>
          <p className="text-sm text-gray-400 mt-1">
  All visible changes
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
<input
  type="date"
  value={selectedDate}
  onChange={(e) => setSelectedDate(e.target.value)}
  className="bg-[#1f2937] px-3 py-2 rounded-lg"
/>
          <button
            onClick={exportDailyReportPDF}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Export PDF
          </button>
          <button
  onClick={() => setSelectedDate("")}
  className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg"
>
  Reset Date
</button>
        </div>
      </div>

      <div className="mb-8 bg-[#111827] p-6 rounded-2xl border border-gray-800">
        <h2 className="text-lg font-semibold mb-2">Changes in last projects</h2>
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

                    {(() => {
                      const displayName =
                        report.userFullName && report.userFullName !== "Unknown user"
                          ? report.userFullName
                          : user?.fullName || "Unknown user";

                      return (
                        <p className="text-sm text-gray-400 mt-1">
                          Name: {displayName}
                        </p>
                      );
                    })()}

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