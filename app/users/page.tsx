"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useIssueStore } from "@/store/useIssueStore";
import { useDailyReportStore } from "@/store/useDailyReportStore";

type SortOption =
  | "name"
  | "tasks_desc"
  | "issues_desc"
  | "performance_desc"
  | "risk_desc";

type RiskLevel = "High" | "Medium" | "Low";

const normalizeId = (value: any) =>
  String(value?._id || value?.id || value || "");

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const getInitials = (name: string) => {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};
const getComputedStatus = (
  item: any,
  allTasks: any[],
  visited = new Set<string>()
): string => {
  const itemKey = normalizeId(item);

  if (!itemKey) {
    return String(item?.status || "Not Started");
  }

  if (visited.has(itemKey)) {
    return String(item?.status || "Not Started");
  }

  const nextVisited = new Set(visited);
  nextVisited.add(itemKey);

  const children = (Array.isArray(allTasks) ? allTasks : []).filter(
    (t: any) =>
      String(t?.parentId || "") === itemKey &&
      String(t?.projectId || "") === String(item?.projectId || "")
  );

  if (children.length === 0) {
    return String(item?.status || "Not Started");
  }

  const childStatuses = children.map((child: any) =>
    getComputedStatus(child, allTasks, nextVisited)
  );

  if (childStatuses.every((s) => s === "Complete")) return "Complete";
  if (childStatuses.some((s) => s === "On Hold")) return "On Hold";
  if (childStatuses.some((s) => s === "In Progress" || s === "Complete")) {
    return "In Progress";
  }

  return String(item?.status || "Not Started");
};
export default function UsersPage() {
  const { currentUser, users, setUsers } = useUserStore() as any;
  const { setProjects, projects } = useProjectStore() as any;
  const { tasks, setTasks } = useTaskStore() as any;
  const { issues, setIssues } = useIssueStore() as any;
  const { reports, setReports } = useDailyReportStore() as any;

  const [mounted, setMounted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedRisk, setSelectedRisk] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("risk_desc");

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [reportsTo, setReportsTo] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setMounted(true);
    loadAllData();
  }, []);

  const loadAllData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [usersRes, tasksRes, projectsRes, issuesRes, reportsRes] =
        await Promise.all([
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/tasks", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/issues", { cache: "no-store" }),
          fetch("/api/daily", { cache: "no-store" }),
        ]);

      if (
        !usersRes.ok ||
        !tasksRes.ok ||
        !projectsRes.ok ||
        !issuesRes.ok ||
        !reportsRes.ok
      ) {
        throw new Error("Failed to load page data");
      }

      const [usersData, tasksData, projectsData, issuesData, reportsData] =
        await Promise.all([
          usersRes.json(),
          tasksRes.json(),
          projectsRes.json(),
          issuesRes.json(),
          reportsRes.json(),
        ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setIssues(Array.isArray(issuesData) ? issuesData : []);
      setReports(Array.isArray(reportsData) ? reportsData : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error loading page data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddUser = async () => {
    try {
      setSaving(true);
      setFormError("");

      if (!fullName.trim() || !role.trim()) {
        setFormError("Full name and role are required.");
        return;
      }

      const payload = {
        fullName: fullName.trim(),
        role: role.trim(),
        department: department.trim(),
        reportsTo: reportsTo || "",
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = "Failed to create user";
        try {
          const data = await res.json();
          message = data?.message || data?.error || message;
        } catch {
          // ignore json parse error
        }
        throw new Error(message);
      }

      setFullName("");
      setRole("");
      setDepartment("");
      setReportsTo("");
      setShowAddForm(false);

      await loadAllData(true);
    } catch (err: any) {
      setFormError(err?.message || "Could not create user.");
    } finally {
      setSaving(false);
    }
  };

  const usersWithMetrics = useMemo(() => {
    return (Array.isArray(users) ? users : []).map((user: any) => {
      const userId = normalizeId(user?._id || user?.id);

      const userTasks = (Array.isArray(tasks) ? tasks : []).filter((t: any) => {
        const assigneeId = normalizeId(t?.assigneeId);
        return assigneeId === userId;
      });

      const openIssues = (Array.isArray(issues) ? issues : []).filter((i: any) => {
        const ownerId = normalizeId(i?.ownerId);
        return ownerId === userId && String(i?.status || "").toLowerCase() === "open";
      });

      const userReports = (Array.isArray(reports) ? reports : []).filter((r: any) => {
        const reportUserId = normalizeId(r?.userId);
        return reportUserId === userId && Number(r?.targetQuantity || 0) > 0;
      });

 const delayedTasks = userTasks.filter((t: any) => {
  const dueDate = t?.dueDate ? new Date(t.dueDate) : null;
  if (!dueDate || Number.isNaN(dueDate.getTime())) return false;

  const taskId = normalizeId(t);
  const hasChildren = (Array.isArray(tasks) ? tasks : []).some(
    (child: any) => String(child?.parentId || "") === taskId
  );

  if (hasChildren) return false;

  const computedStatus = getComputedStatus(
    t,
    Array.isArray(tasks) ? tasks : []
  );

  return dueDate < new Date() && computedStatus !== "Complete";
});

      const completedTasks = userTasks.filter(
        (t: any) => String(t?.status || "") === "Complete"
      );

      const avgPerformance =
        userReports.length > 0
          ? userReports.reduce((sum: number, r: any) => {
              const target = Number(r?.targetQuantity || 0);
              const actual = Number(r?.actualQuantity || 0);
              if (target <= 0) return sum;
              return sum + (actual / target) * 100;
            }, 0) / userReports.length
          : 0;

      const completionRate =
        userTasks.length > 0
          ? (completedTasks.length / userTasks.length) * 100
          : 0;

      let riskScore = 0;
      riskScore += openIssues.length * 12;
      riskScore += delayedTasks.length * 15;
      if (userTasks.length >= 6) riskScore += 12;
      if (avgPerformance < 50 && userReports.length > 0) riskScore += 20;
      else if (avgPerformance < 75 && userReports.length > 0) riskScore += 10;
      if (userReports.length === 0) riskScore += 8;

      riskScore = Math.min(100, riskScore);

      let riskLevel: RiskLevel = "Low";
      if (riskScore >= 45) riskLevel = "High";
      else if (riskScore >= 20) riskLevel = "Medium";

      const manager = (Array.isArray(users) ? users : []).find(
        (u: any) => normalizeId(u?._id || u?.id) === normalizeId(user?.reportsTo)
      );

      const activeProjectsCount = new Set(
        userTasks.map((t: any) => normalizeId(t?.projectId)).filter(Boolean)
      ).size;

      return {
        ...user,
        userId,
        userTasks,
        openIssues,
        userReports,
        delayedTasks,
        completedTasks,
        avgPerformance,
        completionRate,
        riskScore,
        riskLevel,
        managerName: manager?.fullName || "—",
        activeProjectsCount,
      };
    });
  }, [users, tasks, issues, reports]);

  const roleOptions = useMemo(() => {
    const roles = Array.from(
      new Set(
        usersWithMetrics
          .map((u: any) => String(u?.role || "").trim())
          .filter(Boolean)
      )
    ).sort();
    return ["All", ...roles];
  }, [usersWithMetrics]);

  const departmentOptions = useMemo(() => {
    const departments = Array.from(
      new Set(
        usersWithMetrics
          .map((u: any) => String(u?.department || "").trim())
          .filter(Boolean)
      )
    ).sort();
    return ["All", ...departments];
  }, [usersWithMetrics]);

  const filteredUsers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    let data = [...usersWithMetrics].filter((user: any) => {
      const matchesSearch =
        !searchValue ||
        String(user?.fullName || "").toLowerCase().includes(searchValue) ||
        String(user?.role || "").toLowerCase().includes(searchValue) ||
        String(user?.department || "").toLowerCase().includes(searchValue);

      const matchesRole =
        selectedRole === "All" || String(user?.role || "") === selectedRole;

      const matchesDepartment =
        selectedDepartment === "All" ||
        String(user?.department || "") === selectedDepartment;

      const matchesRisk =
        selectedRisk === "All" || String(user?.riskLevel || "") === selectedRisk;

      return matchesSearch && matchesRole && matchesDepartment && matchesRisk;
    });

    data.sort((a: any, b: any) => {
      switch (sortBy) {
        case "name":
          return String(a.fullName || "").localeCompare(String(b.fullName || ""));
        case "tasks_desc":
          return b.userTasks.length - a.userTasks.length;
        case "issues_desc":
          return b.openIssues.length - a.openIssues.length;
        case "performance_desc":
          return b.avgPerformance - a.avgPerformance;
        case "risk_desc":
        default:
          return b.riskScore - a.riskScore;
      }
    });

    return data;
  }, [
    usersWithMetrics,
    search,
    selectedRole,
    selectedDepartment,
    selectedRisk,
    sortBy,
  ]);

  const summary = useMemo(() => {
    const totalUsers = usersWithMetrics.length;
    const totalTasks = usersWithMetrics.reduce(
      (sum: number, u: any) => sum + u.userTasks.length,
      0
    );
    const totalOpenIssues = usersWithMetrics.reduce(
      (sum: number, u: any) => sum + u.openIssues.length,
      0
    );
    const highRiskMembers = usersWithMetrics.filter(
      (u: any) => u.riskLevel === "High"
    ).length;
    const avgTeamPerformance =
      usersWithMetrics.length > 0
        ? usersWithMetrics.reduce(
            (sum: number, u: any) => sum + Number(u.avgPerformance || 0),
            0
          ) / usersWithMetrics.length
        : 0;

    return {
      totalUsers,
      totalTasks,
      totalOpenIssues,
      highRiskMembers,
      avgTeamPerformance,
      activeProjects: Array.isArray(projects) ? projects.length : 0,
    };
  }, [usersWithMetrics, projects]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
              Team Management
            </p>
            <h1 className="text-3xl font-bold md:text-4xl">
              Team Control Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-400 md:text-base">
              Monitor workload, team performance, open issues, and risk levels
              across your organization from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              className="rounded-xl border border-gray-700 bg-[#111827] px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-blue-500 hover:text-white disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

         
            <Link
              href="/dashboard"
              className="rounded-xl border border-gray-700 bg-[#111827] px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-blue-500 hover:text-white"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-lg">
            <p className="text-sm text-gray-400">Team Members</p>
            <p className="mt-2 text-3xl font-bold">{summary.totalUsers}</p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-lg">
            <p className="text-sm text-gray-400">Active Projects</p>
            <p className="mt-2 text-3xl font-bold">{summary.activeProjects}</p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-lg">
            <p className="text-sm text-gray-400">Assigned Tasks</p>
            <p className="mt-2 text-3xl font-bold">{summary.totalTasks}</p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-lg">
            <p className="text-sm text-gray-400">Open Issues</p>
            <p className="mt-2 text-3xl font-bold text-red-400">
              {summary.totalOpenIssues}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-lg">
            <p className="text-sm text-gray-400">Avg Team Performance</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {formatPercent(summary.avgTeamPerformance)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {summary.highRiskMembers} high-risk member(s)
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-gray-800 bg-[#111827] p-4 shadow-lg">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-sm text-gray-400">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, role, or department..."
                className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
              >
                {roleOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
              >
                {departmentOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">Risk</label>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
              >
                {["All", "High", "Medium", "Low"].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="mb-2 block text-sm text-gray-400">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
              >
                <option value="risk_desc">Risk (highest first)</option>
                <option value="performance_desc">
                  Performance (highest first)
                </option>
                <option value="tasks_desc">Tasks (highest first)</option>
                <option value="issues_desc">Open issues (highest first)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedRole("All");
                  setSelectedDepartment("All");
                  setSelectedRisk("All");
                  setSortBy("risk_desc");
                }}
                className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm font-medium text-gray-200 transition hover:border-blue-500 hover:text-white"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-gray-800 bg-[#111827] p-6"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gray-700" />
                  <div className="flex-1">
                    <div className="mb-2 h-4 w-32 rounded bg-gray-700" />
                    <div className="h-3 w-24 rounded bg-gray-800" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((__, i) => (
                    <div key={i} className="rounded-xl bg-[#0f172a] p-4">
                      <div className="mb-2 h-3 w-16 rounded bg-gray-800" />
                      <div className="h-5 w-10 rounded bg-gray-700" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#111827] p-10 text-center shadow-lg">
            <h2 className="text-2xl font-bold">No users found</h2>
            <p className="mt-2 text-gray-400">
              Try changing your search or filters, or add a new team member.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-700"
            >
              Add User
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user: any) => (
              <div
                key={user.userId}
                className="rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-lg transition hover:border-blue-500"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-lg font-bold text-white">
                      {getInitials(user.fullName)}
                    </div>

                    <div>
                      <h2 className="text-xl font-bold">{user.fullName || "Unknown User"}</h2>
                      <p className="text-sm text-gray-400">
                        {user.role || "No role"}{" "}
                        {user.department ? `• ${user.department}` : ""}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      user.riskLevel === "High"
                        ? "bg-red-600/20 text-red-400"
                        : user.riskLevel === "Medium"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-green-600/20 text-green-400"
                    }`}
                  >
                    {user.riskLevel} Risk
                  </span>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#0f172a] p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Tasks
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {user.userTasks.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#0f172a] p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Open Issues
                    </p>
                    <p className="mt-2 text-xl font-bold text-red-400">
                      {user.openIssues.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#0f172a] p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Performance
                    </p>
                    <p className="mt-2 text-xl font-bold text-blue-400">
                      {formatPercent(user.avgPerformance)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#0f172a] p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Completion
                    </p>
                    <p className="mt-2 text-xl font-bold text-green-400">
                      {formatPercent(user.completionRate)}
                    </p>
                  </div>
                </div>

                <div className="mb-5 space-y-2 rounded-xl border border-gray-800 bg-[#0f172a] p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Manager</span>
                    <span className="font-medium text-gray-200">
                      {user.managerName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Delayed Tasks</span>
                    <span className="font-medium text-gray-200">
                      {user.delayedTasks.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Projects</span>
                    <span className="font-medium text-gray-200">
                      {user.activeProjectsCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Risk Score</span>
                    <span className="font-medium text-gray-200">
                      {user.riskScore}/100
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/tasks?assignee=${user.userId}`}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    View Tasks
                  </Link>

                  <Link
                    href={`/daily?userId=${user.userId}`}
                    className="rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-blue-500 hover:text-white"
                  >
                    Reports
                  </Link>

                  <Link
                    href={`/issues?ownerId=${user.userId}`}
                    className="rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-sm font-medium text-gray-200 transition hover:border-blue-500 hover:text-white"
                  >
                    Issues
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Add Team Member</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Create a new user profile for your team.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormError("");
                }}
                className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition hover:border-red-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {formError ? (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {formError}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-gray-400">
                  Full Name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Johnson"
                  className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">Role</label>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Project Manager"
                  className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Department
                </label>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Operations"
                  className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-gray-400">
                  Reports To
                </label>
                <select
                  value={reportsTo}
                  onChange={(e) => setReportsTo(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                >
                  <option value="">No manager</option>
                  {(Array.isArray(users) ? users : []).map((u: any) => {
                    const id = normalizeId(u?._id || u?.id);
                    return (
                      <option key={id} value={id}>
                        {u.fullName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormError("");
                }}
                className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:border-blue-500 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleAddUser}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}