"use client";

import { useUserStore } from "@/store/useUserStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useIssueStore } from "@/store/useIssueStore";
import { useDailyReportStore } from "@/store/useDailyReportStore";
import Link from "next/link";
import { useEffect } from "react";

export default function UsersPage() {
  const { users, setUsers } = useUserStore();
  const { tasks, setTasks } = useTaskStore();
  const { issues, setIssues } = useIssueStore();
  const { reports, setReports } = useDailyReportStore();

  // 🔥 FETCH BACKEND DATA
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [usersRes, tasksRes, issuesRes, reportsRes] =
          await Promise.all([
            fetch("/api/users"),
            fetch("/api/tasks"),
            fetch("/api/issues"),
            fetch("/api/daily"),
          ]);

        const usersData = await usersRes.json();
        const tasksData = await tasksRes.json();
        const issuesData = await issuesRes.json();
        const reportsData = await reportsRes.json();

        setUsers(usersData);
        setTasks(tasksData);
        setIssues(issuesData);
        setReports(reportsData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };

    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">

      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Team Control Center</h1>

        <Link
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {users.map((user) => {

          const userTasks = tasks.filter(
            (t) => t.assigneeId === user._id
          );

          const openIssues = issues.filter(
            (i) => i.ownerId === user._id && i.status === "Open"
          );

          const userReports = reports.filter(
            (r) =>
              r.userId === user._id &&
              r.targetQuantity > 0
          );

          const avgPerformance =
            userReports.length > 0
              ? (
                  userReports.reduce((sum, r) => {
                    return (
                      sum +
                      ((r.actualQuantity /
                        r.targetQuantity) *
                        100)
                    );
                  }, 0) /
                  userReports.length
                ).toFixed(1)
              : "0";

          const riskLevel =
            openIssues.length > 3
              ? "High"
              : openIssues.length > 1
              ? "Medium"
              : "Low";

          return (
            <div
              key={user._id}
              className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-lg hover:border-blue-500 transition"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {user.fullName}
                </h2>

                <span className="text-sm text-gray-400">
                  {user.role}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center mb-6">

                <div>
                  <p className="text-gray-400 text-xs">
                    Tasks
                  </p>
                  <p className="text-lg font-bold">
                    {userTasks.length}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400 text-xs">
                    Open Issues
                  </p>
                  <p className="text-lg font-bold text-red-400">
                    {openIssues.length}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400 text-xs">
                    Avg Performance
                  </p>
                  <p className="text-lg font-bold text-blue-400">
                    {avgPerformance}%
                  </p>
                </div>

              </div>

              <div className="mt-4 text-center">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-bold ${
                    riskLevel === "High"
                      ? "bg-red-600/20 text-red-400"
                      : riskLevel === "Medium"
                      ? "bg-yellow-600/20 text-yellow-400"
                      : "bg-green-600/20 text-green-400"
                  }`}
                >
                  {riskLevel} Risk
                </span>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
