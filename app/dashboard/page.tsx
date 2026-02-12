"use client";

import { useUserStore } from "@/store/useUserStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useIssueStore } from "@/store/useIssueStore";
import { useDailyReportStore } from "@/store/useDailyReportStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";

export default function DashboardPage() {
 const { currentUser, users } = useUserStore();
const currentUserId = currentUser?._id;
  const logout = useUserStore((state) => state.logout);

  const { tasks } = useTaskStore();
  const { issues } = useIssueStore();
  const { reports } = useDailyReportStore();
const [showTeam, setShowTeam] = useState(false);
const setUsers = useUserStore((state) => state.setUsers);

  const router = useRouter();

  const [backendReports, setBackendReports] = useState<any[]>([]);
const teamMembers = users.filter((u) => {
  if (!u.reportsTo) return false;

  const reportsToId =
    typeof u.reportsTo === "object"
      ? u.reportsTo._id
      : u.reportsTo;

  return String(reportsToId) === String(currentUser?._id);
});

useEffect(() => {
  const loadUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
  };

  loadUsers();
}, []);

  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    }
  }, [currentUser]);
  useEffect(() => {
    const fetchDaily = async () => {
      try {
        const res = await fetch("/api/daily");
        const data = await res.json();
        setBackendReports(data);
      } catch (err) {
        console.error("Failed to fetch daily", err);
      }
    };

    fetchDaily();
  }, []);

  const today = new Date();

  // 🔥 Merge local + backend
  const allReports = [
    ...reports,
    ...backendReports.map((r) => ({
      targetQuantity: 0,
      actualQuantity: 0,
      date: r.date,
    })),
  ];

  // KPI CALCULS
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.progress === 100).length;
  const openIssues = issues.filter((i) => i.status === "Open").length;
  const delayedTasks = tasks.filter(
    (t) =>
      new Date(t.dueDate) < today &&
      (t.progress ?? 0) < 100
  ).length;

  const quantitativeReports = allReports.filter(
    (r) => r.targetQuantity > 0
  );

  const avgPerformance =
    quantitativeReports.length > 0
      ? (
          quantitativeReports.reduce((sum, r) => {
            return (
              sum +
              (r.actualQuantity / r.targetQuantity) * 100
            );
          }, 0) / quantitativeReports.length
        ).toFixed(1)
      : "0";

  const chartData = quantitativeReports.map((r) => ({
    date: new Date(r.date).toLocaleDateString(),
    performance:
      (r.actualQuantity / r.targetQuantity) * 100,
  }));

  const riskScore =
    openIssues * 5 +
    delayedTasks * 10 +
    (100 - Number(avgPerformance));

  let insight = "Project running smoothly.";

  if (riskScore > 80)
    insight =
      "Critical risk detected. Immediate intervention required.";
  else if (riskScore > 50)
    insight =
      "Moderate risk level. Monitor delays and open issues.";
  else if (Number(avgPerformance) < 60)
    insight =
      "Performance below optimal levels. Improve productivity.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0e1628] to-[#111827] text-white px-6 py-10">
{/* HEADER */}
{currentUser && (
  <div className="mt-2">

    <div className="text-lg text-gray-300">
      Bonjour,{" "}
      <span className="text-blue-400 font-semibold">
        {currentUser.fullName}
      </span>{" "}
      👋
    </div>

    <div className="text-sm text-gray-400 mb-2 mt-1">
      {currentUser.role}
    </div>

    <button
      onClick={() => setShowTeam(!showTeam)}
     className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md text-xs shadow-sm"

    >
      👥 {showTeam ? "Hide Team" : "View My Team"}
    </button>

    {showTeam && (
      <div className="mt-4 bg-[#111827] p-4 rounded-xl border border-gray-800 mb-6 space-y-3">

        {teamMembers.length === 0 && (
          <p className="text-gray-400 text-sm">
            No team members assigned.
          </p>
        )}

        {teamMembers.map((member) => (
          <div
            key={member._id}
            className="flex justify-between items-center bg-[#1f2937] p-3 rounded-lg"
          >
            <div>
              <p className="font-semibold text-white">
                {member.fullName}
              </p>
              <p className="text-xs text-gray-400">
                {member.role}
              </p>
            </div>

            <span className="text-xs px-3 py-1 rounded-full bg-blue-600/20 text-blue-400">
              {member.department}
            </span>
          </div>
        ))}

      </div>
    )}
   
  </div>
  
)}
 <button
    onClick={() => {
      logout();
      router.push("/login");
    }}
   className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md text-xs"
  >
    Logout
  </button>
      {/* 🔥 QUICK NAVIGATION */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        <Link href="/tasks" className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center">
          📋 Tasks
        </Link>

        <Link href="/daily" className="bg-gradient-to-br from-purple-600 to-purple-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center">
          📝 Daily Reports
        </Link>

        <Link href="/issues" className="bg-gradient-to-br from-red-600 to-red-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center">
          ⚠ Issues
        </Link>

        <Link href="/users" className="bg-gradient-to-br from-green-600 to-green-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center">
          👥 Users
        </Link>

        <Link href="/procurement" className="bg-gradient-to-br from-yellow-600 to-yellow-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center">
          📦 Procurement
        </Link>

        <Link href="/dashboard/executive" className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center">
          📊 Executive View
        </Link>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <Kpi title="Tasks" value={totalTasks} />
        <Kpi title="Completed" value={completedTasks} />
        <Kpi title="Open Issues" value={openIssues} />
        <Kpi title="Delayed" value={delayedTasks} />
      </div>

      {/* Performance + Risk */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">

        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold mb-4">
            Performance Trend
          </h2>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip />
              <Line type="monotone" dataKey="performance" stroke="#3b82f6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col items-center">
          <h2 className="text-lg font-bold mb-4">
            Project Risk Score
          </h2>

          <RadialBarChart
            width={250}
            height={250}
            innerRadius="70%"
            outerRadius="100%"
            data={[
              {
                name: "Risk",
                value: Math.min(riskScore, 100),
                fill: "#ef4444",
              },
            ]}
          >
            <RadialBar dataKey="value" cornerRadius={10} />
          </RadialBarChart>

          <div className="text-2xl font-bold mt-4">
            {Math.round(riskScore)}
          </div>
        </div>
      </div>

      {/* AI INSIGHT */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-2xl border border-blue-500 shadow-lg">
        <h2 className="text-lg font-bold mb-3">
          AI Insight
        </h2>
        <p className="text-blue-200">
          {insight}
        </p>
      </div>

    </div>
  );
}

function Kpi({ title, value }: any) {
  return (
    <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl hover:scale-105 transition duration-300">
      <p className="text-gray-400 text-sm">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  );
}
