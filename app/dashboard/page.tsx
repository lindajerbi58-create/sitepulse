"use client";

import { useUserStore } from "@/store/useUserStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useIssueStore } from "@/store/useIssueStore";
import { useDailyReportStore } from "@/store/useDailyReportStore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

type Task = {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  progress?: number;
  priority?: string;
  dueDate?: string;
  assigneeId?: any;
  createdById?: any;
  createdAt?: string;
  updatedAt?: string;
};

export default function DashboardPage() {
  const { currentUser, users, setUsers } = useUserStore() as any;
  const currentUserId = currentUser?._id;
  const logout = useUserStore((state: any) => state.logout);

  const { tasks: dbTasks, setTasks } = useTaskStore() as any;
  const { issues, setIssues } = useIssueStore() as any;
  const { reports: backendReports, setReports: setBackendReports } = useDailyReportStore() as any;

  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");

  const [showTeam, setShowTeam] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const normalizeId = (value: any) =>
    String(value?._id || value?.id || value || "");

  const safeDate = (value: any) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const isTaskComplete = (task: any) => {
    const progress = Number(task?.progress ?? 0);
    const status = String(task?.status || "").trim().toLowerCase();

    return progress >= 100 || status === "complete" || status === "completed";
  };

  const isCompleted = (task: any) => {
    const status = String(task?.status || "").trim().toLowerCase();
    return status === "complete" || status === "completed" || Number(task?.progress || 0) >= 100;
  };

  const isDelayed = (task: any) => {
    if (!task?.dueDate || isCompleted(task)) return false;
    const due = safeDate(task.dueDate);
    if (!due) return false;
    return due < new Date();
  };

  const isAtRisk = (task: any) => {
    if (!task?.dueDate || isCompleted(task) || isDelayed(task)) return false;

    const now = new Date();
    const due = safeDate(task.dueDate);
    if (!due) return false;

    const diffMs = due.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays <= 3 && diffDays >= 0 && Number(task?.progress || 0) < 60;
  };

  const getTaskBusinessStatus = (task: any) => {
    if (isCompleted(task)) return "Completed";
    if (isDelayed(task)) return "Delayed";
    if (isAtRisk(task)) return "At Risk";
    if (Number(task?.progress || 0) > 0) return "In Progress";
    return "Planned";
  };

  const getTaskStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500/20 text-green-300";
      case "Delayed":
        return "bg-red-500/20 text-red-300";
      case "At Risk":
        return "bg-orange-500/20 text-orange-300";
      case "In Progress":
        return "bg-blue-500/20 text-blue-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const refreshDashboard = async () => {
    try {
      setTasksLoading(true);
      setTasksError("");

      const [tasksRes, usersRes, dailyRes, issuesRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/daily", { cache: "no-store" }),
        fetch("/api/issues", { cache: "no-store" }),
      ]);

      const [tasksData, usersData, dailyData, issuesData] = await Promise.all([
        tasksRes.json(),
        usersRes.json(),
        dailyRes.json(),
        issuesRes.json(),
      ]);

      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setBackendReports(Array.isArray(dailyData) ? dailyData : []);
      setIssues(Array.isArray(issuesData) ? issuesData : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to refresh dashboard", err);
      setTasksError("Unable to load dashboard data.");
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  useEffect(() => {
    if (mounted && !currentUser) {
      router.push("/login");
    }
  }, [mounted, currentUser, router]);

  const teamMembers = useMemo(() => {
    return users.filter((u: any) => {
      if (!u.reportsTo) return false;

      const reportsToId =
        typeof u.reportsTo === "object"
          ? u.reportsTo._id || u.reportsTo.id
          : u.reportsTo;

      return String(reportsToId) === String(currentUserId);
    });
  }, [users, currentUserId]);

  const teamMemberIds = useMemo(() => {
    return teamMembers.map((m: any) => normalizeId(m));
  }, [teamMembers]);

  const allRelevantUserIds = useMemo(() => {
    return [String(currentUserId || ""), ...teamMemberIds];
  }, [currentUserId, teamMemberIds]);

  const allReports = useMemo(() => {
    const defaultReports = backendReports || [];
    return [
      ...defaultReports.map((r: any) => ({
        ...r,
        targetQuantity: Number(r.targetQuantity || 0),
        actualQuantity: Number(r.actualQuantity || 0),
        date: r.date,
        userId: normalizeId(r.userId || r.createdById || r.authorId),
      })),
    ];
  }, [backendReports]);

  const scopedTasks = useMemo(() => {
    return dbTasks.filter((t: any) => {
      const assigneeId = normalizeId(t.assigneeId);
      const createdById = normalizeId(t.createdById);

      return (
        allRelevantUserIds.includes(assigneeId) ||
        allRelevantUserIds.includes(createdById)
      );
    });
  }, [dbTasks, allRelevantUserIds]);

  const scopedIssues = useMemo(() => {
    return issues.filter((i: any) => {
      const assignedTo = normalizeId(i.assignedTo || i.assigneeId);
      const createdBy = normalizeId(i.createdById || i.reportedById);

      return (
        allRelevantUserIds.includes(assignedTo) ||
        allRelevantUserIds.includes(createdBy)
      );
    });
  }, [issues, allRelevantUserIds]);

  const quantitativeReports = useMemo(() => {
    return allReports.filter((r: any) => Number(r.targetQuantity) > 0);
  }, [allReports]);

  const avgPerformance = useMemo(() => {
    if (quantitativeReports.length === 0) return 0;

    const avg =
      quantitativeReports.reduce((sum: number, r: any) => {
        const target = Number(r.targetQuantity || 0);
        const actual = Number(r.actualQuantity || 0);
        if (target <= 0) return sum;
        return sum + (actual / target) * 100;
      }, 0) / quantitativeReports.length;

    return Number(avg.toFixed(1));
  }, [quantitativeReports]);

  const chartData = useMemo(() => {
    return quantitativeReports.map((r: any) => ({
      date: new Date(r.date).toLocaleDateString(),
      performance: Number(
        (((r.actualQuantity || 0) / (r.targetQuantity || 1)) * 100).toFixed(1)
      ),
    }));
  }, [quantitativeReports]);

  const delayedTasksList = useMemo(() => {
    return scopedTasks.filter((t: any) => {
      const due = safeDate(t.dueDate);
      return !!due && due < new Date() && !isTaskComplete(t);
    });
  }, [scopedTasks]);

  const dueSoonTasks = useMemo(() => {
    return scopedTasks.filter((t: any) => {
      const due = safeDate(t.dueDate);
      if (!due || isTaskComplete(t)) return false;

      const diffMs = due.getTime() - new Date().getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      return diffDays >= 0 && diffDays <= 3;
    });
  }, [scopedTasks]);

  const completedTasks = useMemo(() => {
    return scopedTasks.filter((t: any) => isTaskComplete(t)).length;
  }, [scopedTasks]);

  const totalTasks = scopedTasks.length;
  const openIssues = scopedIssues.filter(
    (i: any) => String(i.status || "").toLowerCase() === "open"
  ).length;
  const delayedTasks = delayedTasksList.length;

  const criticalTasks = useMemo(() => {
    return scopedTasks
      .filter((t: any) => {
        if (isTaskComplete(t)) return false;

        const due = safeDate(t.dueDate);
        const progress = Number(t.progress ?? 0);
        const isHighPriority =
          String(t.priority || "").toLowerCase() === "high";
        const taskDelayed = !!due && due < new Date();
        const stalled = progress === 0;
        const taskAtRisk = isAtRisk(t);

        return isHighPriority || taskDelayed || stalled || taskAtRisk;
      })
      .sort((a: any, b: any) => {
        const aDue = safeDate(a.dueDate)?.getTime() || 0;
        const bDue = safeDate(b.dueDate)?.getTime() || 0;
        return aDue - bDue;
      })
      .slice(0, 5);
  }, [scopedTasks]);

  const workloadData = useMemo(() => {
    return teamMembers.map((member: any) => {
      const memberId = normalizeId(member);

      const memberTasks = scopedTasks.filter(
        (t: any) => normalizeId(t.assigneeId) === memberId
      );

      const memberDelayed = memberTasks.filter((t: any) => {
        const due = safeDate(t.dueDate);
        return !!due && due < new Date() && !isTaskComplete(t);
      }).length;

      return {
        id: memberId,
        fullName: member.fullName,
        role: member.role,
        totalTasks: memberTasks.length,
        delayedTasks: memberDelayed,
        inProgress: memberTasks.filter(
          (t: any) => !isTaskComplete(t) && Number(t.progress ?? 0) > 0
        ).length,
        completed: memberTasks.filter((t: any) => isTaskComplete(t)).length,
      };
    });
  }, [teamMembers, scopedTasks]);

  const reportsSubmittedTodayByTeam = useMemo(() => {
    const todayStr = new Date().toDateString();

    const submittedIds = new Set(
      allReports
        .filter((r: any) => {
          const d = safeDate(r.date);
          if (!d) return false;
          return d.toDateString() === todayStr;
        })
        .map((r: any) => normalizeId(r.userId || r.createdById || r.authorId))
        .filter(Boolean)
    );

    return teamMembers.filter((m: any) => submittedIds.has(normalizeId(m))).length;
  }, [allReports, teamMembers]);

  const reportsTodayCount = useMemo(() => {
    const todayStr = new Date().toDateString();

    return allReports.filter((r: any) => {
      const d = safeDate(r.date);
      if (!d) return false;
      return d.toDateString() === todayStr;
    }).length;
  }, [allReports]);

  const expectedReportsToday = teamMembers.length;
  const missingReportsToday = Math.max(
    expectedReportsToday - reportsSubmittedTodayByTeam,
    0
  );

  const missingReportMembers = useMemo(() => {
    const todayStr = new Date().toDateString();

    const submittedIds = new Set(
      allReports
        .filter((r: any) => {
          const d = safeDate(r.date);
          if (!d) return false;
          return d.toDateString() === todayStr;
        })
        .map((r: any) => normalizeId(r.userId || r.createdById || r.authorId))
        .filter(Boolean)
    );

    return teamMembers.filter((m: any) => !submittedIds.has(normalizeId(m)));
  }, [allReports, teamMembers]);

  const delayedPenalty = delayedTasks * 10;
  const issuesPenalty = openIssues * 5;
  const performancePenalty = Math.max(0, 100 - avgPerformance);
  const criticalPenalty = criticalTasks.length * 6;
  const missingReportsPenalty = missingReportsToday * 8;
  const workloadPenalty =
    workloadData.filter((w: any) => w.totalTasks >= 6 || w.delayedTasks >= 3).length * 5;

  const riskScoreRaw =
    delayedPenalty +
    issuesPenalty +
    performancePenalty +
    criticalPenalty +
    missingReportsPenalty +
    workloadPenalty;

  const riskScore = Math.min(Math.round(riskScoreRaw), 100);

  const riskLevel =
    riskScore >= 80
      ? "Critical"
      : riskScore >= 55
        ? "High"
        : riskScore >= 30
          ? "Moderate"
          : "Low";

  const priorities = useMemo(() => {
    const items: string[] = [];

    if (delayedTasks > 0) {
      items.push(
        `Review ${delayedTasks} delayed task${delayedTasks > 1 ? "s" : ""}`
      );
    }

    if (openIssues > 0) {
      items.push(
        `Resolve ${openIssues} open issue${openIssues > 1 ? "s" : ""}`
      );
    }

    if (dueSoonTasks.length > 0) {
      items.push(
        `Track ${dueSoonTasks.length} task${dueSoonTasks.length > 1 ? "s" : ""} due in the next 3 days`
      );
    }

    if (missingReportsToday > 0) {
      items.push(
        `Follow up on ${missingReportsToday} missing daily report${missingReportsToday > 1 ? "s" : ""}`
      );
    }

    const overloaded = workloadData.filter(
      (w: any) => w.totalTasks >= 6 || w.delayedTasks >= 3
    );

    if (overloaded.length > 0) {
      items.push(
        `Rebalance workload for ${overloaded.length} team member${overloaded.length > 1 ? "s" : ""}`
      );
    }

    if (items.length === 0) {
      items.push("No urgent actions detected today");
    }

    return items.slice(0, 5);
  }, [
    delayedTasks,
    openIssues,
    dueSoonTasks.length,
    missingReportsToday,
    workloadData,
  ]);

  const insight = useMemo(() => {
    const reasons: string[] = [];
    const actions: string[] = [];

    if (delayedTasks > 0) reasons.push(`${delayedTasks} delayed tasks`);
    if (openIssues > 0) reasons.push(`${openIssues} open issues`);
    if (missingReportsToday > 0) reasons.push(`${missingReportsToday} missing daily reports`);
    if (avgPerformance < 70) reasons.push(`performance at ${avgPerformance}%`);

    if (delayedTasks > 0) actions.push("review delayed critical tasks");
    if (openIssues > 0) actions.push("resolve blockers");
    if (missingReportsToday > 0) actions.push("follow up on reporting compliance");

    if (workloadData.some((w: any) => w.totalTasks >= 6 || w.delayedTasks >= 3)) {
      actions.push("rebalance team workload");
    }

    if (riskScore >= 80) {
      return `Critical risk detected due to ${reasons.join(", ")}. Immediate action required: ${actions.join(", ")}.`;
    }

    if (riskScore >= 55) {
      return `High risk level driven by ${reasons.join(", ")}. Recommended next steps: ${actions.join(", ")}.`;
    }

    if (riskScore >= 30) {
      return `Moderate risk observed. Main factors: ${reasons.join(", ")}. Continue close monitoring and preventive action.`;
    }

    return "Project is operating within acceptable limits. Continue monitoring delivery pace, reporting consistency, and task completion.";
  }, [
    riskScore,
    delayedTasks,
    openIssues,
    missingReportsToday,
    avgPerformance,
    workloadData,
  ]);

  const recentActivity = useMemo(() => {
    const taskActivities = scopedTasks.map((t: any) => ({
      type: "task",
      label: `Task updated: ${t.title || "Untitled task"}`,
      date: safeDate(t.updatedAt || t.createdAt || t.dueDate),
      href: t?._id || t?.id ? `/tasks/${t._id || t.id}` : "/tasks",
    }));

    const reportActivities = allReports.map((r: any) => ({
      type: "report",
      label: `Daily report submitted`,
      date: safeDate(r.createdAt || r.date),
      href: "/daily",
    }));

    const issueActivities = scopedIssues.map((i: any) => ({
      type: "issue",
      label: `Issue opened: ${i.title || i.description || "Untitled issue"}`,
      date: safeDate(i.createdAt || i.date),
      href: i?._id || i?.id ? `/issues/${i._id || i.id}` : "/issues",
    }));

    return [...taskActivities, ...reportActivities, ...issueActivities]
      .filter((item) => item.date)
      .sort((a: any, b: any) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
      .slice(0, 6);
  }, [scopedTasks, allReports, scopedIssues]);

  console.log("DB TASKS", dbTasks);
  console.log(
    "scopedTasks debug",
    scopedTasks.map((t: any) => ({
      title: t.title,
      status: t.status,
      progress: t.progress,
      dueDate: t.dueDate,
      businessStatus: getTaskBusinessStatus(t),
      isComplete: isTaskComplete(t),
    }))
  );

  if (!mounted || tasksLoading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0e1628] to-[#111827] text-white px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
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

          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button
              onClick={() => setShowTeam(!showTeam)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md text-xs shadow-sm"
            >
              👥 {showTeam ? "Hide Team" : "View My Team"}
            </button>

            <button
              onClick={refreshDashboard}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-xs shadow-sm"
            >
              ↻ Refresh Dashboard
            </button>

            {lastUpdated && (
              <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-gray-700 text-gray-300">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md text-xs h-fit"
        >
          Logout
        </button>
      </div>

      {tasksError && (
        <div className="mt-6 mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {tasksError}
        </div>
      )}

      {showTeam && (
        <div className="mt-6 bg-[#111827] p-4 rounded-xl border border-gray-800 mb-6 space-y-3">
          {teamMembers.length === 0 && (
            <p className="text-gray-400 text-sm">
              No team members assigned.
            </p>
          )}

          {teamMembers.map((member: any, index: number) => (
            <Link
              key={`${normalizeId(member)}-${index}`}
              href={`/users/${normalizeId(member)}`}
              className="flex justify-between items-center bg-[#1f2937] p-3 rounded-lg hover:bg-[#243041] transition"
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
                {member.department || "No department"}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10 mt-6">
        <Link
          href="/tasks"
          className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center"
        >
          📋 Tasks
        </Link>

        <Link
          href="/daily"
          className="bg-gradient-to-br from-purple-600 to-purple-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center"
        >
          📝 Last Reports
        </Link>

        <Link
          href="/issues"
          className="bg-gradient-to-br from-red-600 to-red-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center"
        >
          ⚠ Issues
        </Link>

        <Link
          href="/users"
          className="bg-gradient-to-br from-green-600 to-green-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center"
        >
          👥 Users
        </Link>

        <Link
          href="/procurement"
          className="bg-gradient-to-br from-yellow-600 to-yellow-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center"
        >
          📦 Procurement
        </Link>

        <Link
          href="/dashboard/executive"
          className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-4 rounded-2xl shadow-lg hover:scale-105 transition transform text-center"
        >
          📊 Executive View
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <Link href="/tasks" className="block">
          <Kpi
            title="Tasks"
            value={totalTasks}
            subtitle={`${dueSoonTasks.length} due soon`}
          />
        </Link>

        <Link href="/tasks?status=completed" className="block">
          <Kpi
            title="Completed"
            value={completedTasks}
            subtitle={`${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% completion`}
          />
        </Link>

        <Link href="/issues?status=open" className="block">
          <Kpi
            title="Open Issues"
            value={openIssues}
            subtitle={openIssues > 0 ? "Need follow-up" : "Under control"}
          />
        </Link>

        <Link href="/tasks?filter=delayed" className="block">
          <Kpi
            title="Delayed"
            value={delayedTasks}
            subtitle={delayedTasks > 0 ? "Action required" : "On schedule"}
          />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold mb-4">Today’s Priorities</h2>
          <div className="space-y-3">
            {priorities.map((item, index) => (
              <div
                key={`priority-${index}`}
                className="bg-[#0b1220] border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-200"
              >
                {index + 1}. {item}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold mb-4">Risk Breakdown</h2>
          <div className="space-y-3 text-sm">
            <RiskRow label="Delayed tasks impact" value={delayedPenalty} />
            <RiskRow label="Open issues impact" value={issuesPenalty} />
            <RiskRow
              label="Performance impact"
              value={Math.round(performancePenalty)}
            />
            <RiskRow label="Critical task impact" value={criticalPenalty} />
            <RiskRow
              label="Missing reports impact"
              value={missingReportsPenalty}
            />
            <RiskRow
              label="Workload imbalance impact"
              value={workloadPenalty}
            />
            <div className="pt-3 border-t border-gray-700 flex justify-between font-semibold text-white">
              <span>Total Risk Level</span>
              <span>{riskLevel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold mb-4">Performance Trend</h2>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="performance"
                  stroke="#3b82f6"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
              No performance data available yet. Add quantitative daily reports to unlock trends.
            </div>
          )}
        </div>

        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl flex flex-col items-center">
          <h2 className="text-lg font-bold mb-4">Project Risk Score</h2>

          <RadialBarChart
            width={250}
            height={250}
            innerRadius="70%"
            outerRadius="100%"
            data={[
              {
                name: "Risk",
                value: Math.min(riskScore, 100),
                fill:
                  riskScore >= 80
                    ? "#ef4444"
                    : riskScore >= 55
                      ? "#f97316"
                      : riskScore >= 30
                        ? "#eab308"
                        : "#22c55e",
              },
            ]}
          >
            <RadialBar dataKey="value" cornerRadius={10} />
          </RadialBarChart>

          <div className="text-2xl font-bold mt-4">{riskScore}/100</div>
          <div className="text-sm mt-2 text-gray-300">{riskLevel} Risk</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold mb-4">Critical Tasks</h2>

          {criticalTasks.length === 0 ? (
            <p className="text-sm text-gray-400">No critical tasks detected.</p>
          ) : (
            <div className="space-y-3">
              {criticalTasks.map((task: any, index: number) => {
                const due = safeDate(task.dueDate);
                const businessStatus = getTaskBusinessStatus(task);

                return (
                  <Link
                    href={task?._id || task?.id ? `/tasks/${task._id || task.id}` : "/tasks"}
                    key={`${normalizeId(task)}-${index}`}
                    className="block bg-[#0b1220] border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-white">{task.title}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Priority: {task.priority || "N/A"} • Progress: {task.progress ?? 0}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Due: {due ? due.toLocaleDateString() : "N/A"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Status: {task.status || "N/A"}
                        </div>
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full ${getTaskStatusBadgeClasses(
                          businessStatus
                        )}`}
                      >
                        {businessStatus}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold mb-4">Team Workload</h2>

          {workloadData.length === 0 ? (
            <p className="text-sm text-gray-400">No team members found.</p>
          ) : (
            <div className="space-y-3">
              {workloadData.map((member: any, index: number) => (
                <Link
                  href={`/users/${member.id}`}
                  key={`${member.id}-${index}`}
                  className="block bg-[#0b1220] border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-medium text-white">
                        {member.fullName}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {member.role}
                      </div>
                    </div>

                    <span
                      className={`text-xs px-3 py-1 rounded-full ${member.totalTasks >= 6 || member.delayedTasks >= 3
                          ? "bg-red-500/20 text-red-300"
                          : "bg-green-500/20 text-green-300"
                        }`}
                    >
                      {member.totalTasks >= 6 || member.delayedTasks >= 3
                        ? "Heavy Load"
                        : "Balanced"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mt-4 text-center text-sm">
                    <MiniStat label="Tasks" value={member.totalTasks} />
                    <MiniStat label="Delayed" value={member.delayedTasks} />
                    <MiniStat label="Doing" value={member.inProgress} />
                    <MiniStat label="Done" value={member.completed} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold mb-4">Recent Activity</h2>

          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity found.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item: any, index: number) => (
                <Link
                  key={`activity-${index}`}
                  href={item.href}
                  className="block bg-[#0b1220] border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-600 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-white">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.type}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.date ? item.date.toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-lg font-bold mb-4">Reporting Compliance</h2>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <MiniStat label="Expected" value={expectedReportsToday} />
            <MiniStat label="Submitted" value={reportsSubmittedTodayByTeam} />
            <MiniStat label="Missing" value={missingReportsToday} />
          </div>

          <div className="text-sm text-gray-300 mb-4">
            Total reports logged today:{" "}
            <span className="font-semibold text-white">{reportsTodayCount}</span>
          </div>

          {missingReportMembers.length === 0 ? (
            <div className="text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
              All team members submitted their daily reports today.
            </div>
          ) : (
            <div className="space-y-3">
              {missingReportMembers.map((member: any, index: number) => (
                <div
                  key={`missing-${normalizeId(member)}-${index}`}
                  className="bg-[#0b1220] border border-gray-800 rounded-lg px-4 py-3"
                >
                  <div className="font-medium text-white">{member.fullName}</div>
                  <div className="text-xs text-gray-400 mt-1">{member.role}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-2xl border border-blue-500 shadow-lg">
        <h2 className="text-lg font-bold mb-3">Operational Insight</h2>
        <p className="text-blue-200 leading-7">{insight}</p>
      </div>
    </div>
  );
}

function Kpi({ title, value, subtitle }: any) {
  return (
    <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 shadow-xl hover:scale-105 transition duration-300">
      <p className="text-gray-400 text-sm">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
    </div>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <div className="bg-[#111827] border border-gray-700 rounded-lg px-2 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-base font-semibold text-white mt-1">{value}</div>
    </div>
  );
}

function RiskRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-300">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}