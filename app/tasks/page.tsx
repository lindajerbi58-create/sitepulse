"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { predictDelay } from "@/lib/delayPredictor";
import { useProjectStore } from "@/store/useProjectStore";
import { useUserStore } from "@/store/useUserStore";

type ViewMode = "my" | "assigned" | "all";

type TaskStatus = "Not Started" | "In Progress" | "On Hold" | "Complete";

type Task = {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  projectId?: string;
  parentId?: string | null;
  assigneeId?: string | { _id?: string; id?: string } | null;
  createdById?: string | { _id?: string; id?: string } | null;
  status?: TaskStatus | string;
  priority?: "Low" | "Medium" | "High" | string;
  dueDate?: string;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
};

type User = {
  _id?: string;
  id?: string;
  fullName?: string;
  role?: string;
};

type Report = {
  _id?: string;
  id?: string;
  createdAt?: string;
  date?: string;
  userId?: string | { _id?: string; id?: string } | null;
  targetQuantity?: number;
  actualQuantity?: number;
};

type ProcurementItem = {
  _id?: string;
  id?: string;
  relatedTaskId?: string | { _id?: string; id?: string } | null;
  status?: string;
};

type Project = {
  _id?: string;
  id?: string;
  name?: string;
};

export default function TasksPage() {
  const router = useRouter();

  const currentUser = useUserStore((state: any) => state.currentUser);
const { currentProjectId, setCurrentProjectId } = useProjectStore() as any;

  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [mounted, setMounted] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const normalizeId = (value: any) =>
    String(value?._id || value?.id || value || "");

  const safeDate = (value: any) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const isDev = process.env.NODE_ENV !== "production";

  const loadAllData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [tasksRes, usersRes, dailyRes, procurementRes, projectsRes] =
        await Promise.all([
          fetch("/api/tasks", { cache: "no-store" }),
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/daily", { cache: "no-store" }),
          fetch("/api/procurement", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" }),
        ]);

      if (!tasksRes.ok) throw new Error("Failed to load tasks");
      if (!usersRes.ok) throw new Error("Failed to load users");
      if (!dailyRes.ok) throw new Error("Failed to load daily reports");
      if (!procurementRes.ok) throw new Error("Failed to load procurement");
      if (!projectsRes.ok) throw new Error("Failed to load projects");

      const [tasksData, usersData, dailyData, procurementData, projectsData] =
        await Promise.all([
          tasksRes.json(),
          usersRes.json(),
          dailyRes.json(),
          procurementRes.json(),
          projectsRes.json(),
        ]);

      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setReports(Array.isArray(dailyData) ? dailyData : []);
      setProcurementItems(Array.isArray(procurementData) ? procurementData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unable to load tasks page data.");
      setTasks([]);
      setUsers([]);
      setReports([]);
      setProcurementItems([]);
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    loadAllData();
  }, [mounted]);
useEffect(() => {
  if (!mounted) return;

  if (currentProjectId) return;

  // 1) priorité : premier projet venant de la BD
  if (projects.length > 0) {
    const firstProjectId = normalizeId(projects[0]);

    if (firstProjectId) {
      setCurrentProjectId(firstProjectId);
      return;
    }
  }

  // 2) fallback : déduire depuis les tâches si elles ont un projectId
  const firstTaskWithProject = tasks.find((t) => t.projectId);
  if (firstTaskWithProject?.projectId) {
    setCurrentProjectId(String(firstTaskWithProject.projectId));
    return;
  }

  // 3) si vraiment rien n'existe, redirection
  router.push("/projects");
}, [mounted, currentProjectId, projects, tasks, router, setCurrentProjectId]);

const activeProject = useMemo(() => {
  if (currentProjectId) {
    const exactMatch = projects.find(
      (p: any) => normalizeId(p) === String(currentProjectId || "")
    );
    if (exactMatch) return exactMatch;
  }

  // fallback 1 : si un seul projet existe en base, on le prend
  if (projects.length === 1) {
    return projects[0];
  }

  // fallback 2 : si un projectId existe dans les tâches, on essaie de matcher
  const taskProjectId = tasks.find((t: any) => t.projectId)?.projectId;
  if (taskProjectId) {
    return projects.find(
      (p: any) => normalizeId(p) === String(taskProjectId)
    );
  }

  return null;
}, [projects, currentProjectId, tasks]);
const effectiveProjectId =
  currentProjectId ||
  normalizeId(activeProject) ||
  tasks.find((t: any) => t.projectId)?.projectId ||
  "";

const activeProjectLabel = activeProject?.name || "Unnamed Project";

console.log("currentProjectId =", currentProjectId);
console.log(
  "projects =",
  projects.map((p: any) => ({
    name: p.name,
    id: p.id,
    _id: p._id,
    normalized: normalizeId(p),
  }))
);
console.log(
  "tasks projectIds =",
  tasks.map((t: any) => ({
    title: t.title,
    projectId: t.projectId,
  }))
);

  const sortByDate = (a: Task, b: Task) => {
    const aTime = safeDate(a.dueDate)?.getTime() || 0;
    const bTime = safeDate(b.dueDate)?.getTime() || 0;
    return aTime - bTime;
  };

  const getComputedStatus = (
    item: Task,
    allTasks: Task[],
    visited = new Set<string>()
  ): TaskStatus => {
    const itemKey = normalizeId(item);

    if (!itemKey) {
      return (item.status || "Not Started") as TaskStatus;
    }

    if (visited.has(itemKey)) {
      return (item.status || "Not Started") as TaskStatus;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(itemKey);

    const children = (allTasks || []).filter(
      (t: Task) =>
        String(t.parentId || "") === itemKey &&
        String(t.projectId || "") === String(item.projectId || "")
    );

    if (children.length === 0) {
      return (item.status || "Not Started") as TaskStatus;
    }

    const childStatuses = children.map((child) =>
      getComputedStatus(child, allTasks, nextVisited)
    );

    if (childStatuses.every((s) => s === "Complete")) return "Complete";
    if (childStatuses.some((s) => s === "On Hold")) return "On Hold";
    if (childStatuses.some((s) => s === "In Progress" || s === "Complete")) {
      return "In Progress";
    }

    return (item.status || "Not Started") as TaskStatus;
  };

const projectTasks = useMemo(() => {
  const selectedProjectId =
    currentProjectId ||
    normalizeId(activeProject) ||
    tasks.find((t: any) => t.projectId)?.projectId ||
    "";

  return tasks.filter(
    (task) => String(task.projectId || "") === String(selectedProjectId)
  );
}, [tasks, currentProjectId, activeProject]);

  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];

    const me = String(currentUser._id || currentUser.id || "");

    return projectTasks.filter((task) => {
      const assigneeId = normalizeId(task.assigneeId);
      const createdById = normalizeId(task.createdById);

      if (viewMode === "all") {
        return assigneeId === me || createdById === me;
      }

      if (viewMode === "my") {
        return assigneeId === me;
      }

      if (viewMode === "assigned") {
        return createdById === me;
      }

      return false;
    });
  }, [projectTasks, currentUser, viewMode]);

  const activeTasks = useMemo(() => {
    return filteredTasks.filter((task) => {
      const parentKey = normalizeId(task);

      const subtasks = tasks.filter(
        (t) =>
          String(t.parentId || "") === parentKey &&
          String(t.projectId || "") === String(currentProjectId || "")
      );

      const total = subtasks.length;
      const completed = subtasks.filter(
        (st) => getComputedStatus(st, tasks) === "Complete"
      ).length;

      const progress =
        total > 0 ? Math.round((completed / total) * 100) : Number(task.progress || 0);

      const displayedStatus = getComputedStatus(task, tasks);

      return displayedStatus !== "Complete" && progress < 100;
    });
  }, [filteredTasks, tasks, currentProjectId]);

  const historyTasks = useMemo(() => {
    return filteredTasks.filter((task) => {
      const parentKey = normalizeId(task);

      const subtasks = tasks.filter(
        (t) =>
          String(t.parentId || "") === parentKey &&
          String(t.projectId || "") === String(currentProjectId || "")
      );

      const total = subtasks.length;
      const completed = subtasks.filter(
        (st) => getComputedStatus(st, tasks) === "Complete"
      ).length;

      const progress =
        total > 0 ? Math.round((completed / total) * 100) : Number(task.progress || 0);

      const displayedStatus = getComputedStatus(task, tasks);

      return displayedStatus === "Complete" || progress === 100;
    });
  }, [filteredTasks, tasks, currentProjectId]);

  const high = useMemo(
    () =>
      activeTasks
        .filter((t) => String(t.priority || "") === "High")
        .sort(sortByDate),
    [activeTasks]
  );

  const medium = useMemo(
    () =>
      activeTasks
        .filter((t) => String(t.priority || "") === "Medium")
        .sort(sortByDate),
    [activeTasks]
  );

  const low = useMemo(
    () =>
      activeTasks
        .filter((t) => String(t.priority || "") === "Low")
        .sort(sortByDate),
    [activeTasks]
  );

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "Complete":
        return "bg-green-500/20 text-green-300 border border-green-500/30";
      case "In Progress":
        return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
      case "On Hold":
        return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
    }
  };

  const getPriorityBadgeClasses = (priority: string) => {
    switch (String(priority || "").toLowerCase()) {
      case "high":
        return "bg-red-500/20 text-red-300 border border-red-500/30";
      case "medium":
        return "bg-orange-500/20 text-orange-300 border border-orange-500/30";
      default:
        return "bg-green-500/20 text-green-300 border border-green-500/30";
    }
  };

  const getDelayRiskBadgeClasses = (risk: string) => {
    switch (String(risk || "").toLowerCase()) {
      case "high":
        return "bg-red-500/20 text-red-300 border border-red-500/30";
      case "medium":
        return "bg-orange-500/20 text-orange-300 border border-orange-500/30";
      case "low":
        return "bg-green-500/20 text-green-300 border border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
    }
  };

  const renderGroup = (title: string, color: string, list: Task[]) => {
    if (list.length === 0) return null;

    return (
      <div className="mb-12">
        <h2 className={`text-xl font-bold mb-4 ${color}`}>{title}</h2>

        <div className="space-y-4">
          {list.map((task, index) => {
            const taskId = normalizeId(task);

            const blocked = procurementItems.some(
              (p) =>
                normalizeId(p.relatedTaskId) === taskId &&
                String(p.status || "") !== "Delivered"
            );

            const delayRisk = predictDelay(task, reports);

            const assignee = users.find(
              (u) => normalizeId(u) === normalizeId(task.assigneeId)
            );

            const subtasks = tasks.filter(
              (t) =>
                String(t.parentId || "") === taskId &&
                String(t.projectId || "") === String(currentProjectId || "")
            );

            const totalSubtasks = subtasks.length;
            const completedSubtasks = subtasks.filter(
              (st) => getComputedStatus(st, tasks) === "Complete"
            ).length;

            const progress =
              totalSubtasks > 0
                ? Math.round((completedSubtasks / totalSubtasks) * 100)
                : Number(task.progress || 0);

            const computedTaskStatus = getComputedStatus(task, tasks);
            const rawTaskStatus = task.status || "Not Started";

            return (
              <div
                key={taskId || `${task.title}-${task.dueDate}-${index}`}
                onClick={() => {
                  if (!taskId) return;
                  if (computedTaskStatus !== "Complete") {
                    router.push(`/tasks/${taskId}`);
                  }
                }}
                className={`bg-[#111827] border p-5 rounded-2xl shadow-lg transition-all duration-200 ${
                  computedTaskStatus === "Complete"
                    ? "border-gray-700 opacity-50 grayscale cursor-not-allowed"
                    : "border-gray-800 cursor-pointer hover:border-blue-500 hover:scale-[1.01]"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{task.title}</h3>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${getPriorityBadgeClasses(
                          String(task.priority || "Low")
                        )}`}
                      >
                        {task.priority || "No Priority"}
                      </span>

                      <span
                        className={`text-xs px-3 py-1 rounded-full ${getStatusBadgeClasses(
                          computedTaskStatus
                        )}`}
                      >
                        {computedTaskStatus}
                      </span>

                      <span
                        className={`text-xs px-3 py-1 rounded-full ${getDelayRiskBadgeClasses(
                          String(delayRisk)
                        )}`}
                      >
                        Delay Risk: {String(delayRisk)}
                      </span>

                      {blocked && (
                        <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          Waiting for Materials
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 md:text-right">
                    <div>
                      Due:{" "}
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "N/A"}
                    </div>
                    <div className="mt-1">
                      Assigned: {assignee?.fullName || "Unassigned"}
                    </div>
                  </div>
                </div>

                <div className="text-sm mt-4">
                  Status:{" "}
                  <span className="font-medium text-gray-300">
                    {computedTaskStatus}
                  </span>
                  {computedTaskStatus !== rawTaskStatus && (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      auto
                    </span>
                  )}
                </div>

                <div className="mt-6 flex flex-col items-center">
                  <div className="flex justify-between w-full md:w-2/3 text-xs mb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="font-bold text-blue-400">{progress}%</span>
                  </div>

                  <div className="w-full md:w-2/3 bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-green-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {totalSubtasks > 0 ? (
                    <div className="text-sm mt-2 text-gray-400">
                      {completedSubtasks} / {totalSubtasks} completed
                    </div>
                  ) : (
                    <div className="text-sm mt-2 text-gray-400">
                      Qualitative task
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Loading tasks...
      </div>
    );
  }

  if (!currentProjectId) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Redirecting to Projects...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Task Control Center</h1>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode("all")}
            className={`px-4 py-2 rounded-lg ${
              viewMode === "all" ? "bg-gray-500" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setViewMode("my")}
            className={`px-4 py-2 rounded-lg ${
              viewMode === "my" ? "bg-blue-600" : "bg-blue-700 hover:bg-blue-600"
            }`}
          >
            My Tasks
          </button>

          <button
            onClick={() => setViewMode("assigned")}
            className={`px-4 py-2 rounded-lg ${
              viewMode === "assigned"
                ? "bg-purple-600"
                : "bg-purple-700 hover:bg-purple-600"
            }`}
          >
            Assigned by Me
          </button>

          <button
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <Link
            href="/tasks/new"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg shadow-lg"
          >
            + New Task
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between bg-[#111827] border border-gray-800 px-4 py-3 rounded-xl mb-6">
        <div className="text-sm text-gray-400">
          Active Project:
          <span className="ml-2 text-blue-400 font-semibold">
            {activeProjectLabel}
          </span>
        </div>

        <Link
          href="/projects"
          className="text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md"
        >
          Switch Project
        </Link>
      </div>

      {error && (
        <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MiniKpi title="Visible Tasks" value={filteredTasks.length} />
        <MiniKpi title="Active" value={activeTasks.length} />
        <MiniKpi title="History" value={historyTasks.length} />
        <MiniKpi
          title="High Priority"
          value={high.length}
          accent="text-red-400"
        />
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-10 text-center text-gray-400">
          No tasks found for this view.
        </div>
      ) : (
        <>
          {renderGroup("HIGH PRIORITY", "text-red-400", high)}
          {renderGroup("MEDIUM PRIORITY", "text-green-400", medium)}
          {renderGroup("LOW PRIORITY", "text-yellow-400", low)}

          {historyTasks.length > 0 && (
            <div className="mt-16">
              <h2 className="text-xl font-bold text-gray-500 mb-6">History</h2>

              <div className="space-y-4">
                {historyTasks.map((task, index) => {
                  const taskId = normalizeId(task);
                  const computedTaskStatus = getComputedStatus(task, tasks);

                  return (
                    <div
                      key={taskId || `${task.title}-${task.dueDate}-${index}`}
                      className="bg-[#1a1f2e] border border-gray-700 p-5 rounded-2xl opacity-70 grayscale"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-300">
                            {task.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-2">
                            {computedTaskStatus === "Complete"
                              ? "Completed"
                              : computedTaskStatus}
                          </p>
                        </div>

                        <Link
                          href={`/tasks/${taskId}`}
                          className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg w-fit"
                        >
                          Open Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <Link
        href="/tasks/new"
        className="fixed bottom-8 right-8 bg-green-600 hover:bg-green-700 w-14 h-14 flex items-center justify-center rounded-full shadow-2xl text-2xl"
      >
        +
      </Link>
    </div>
  );
}

function MiniKpi({
  title,
  value,
  accent = "text-white",
}: {
  title: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
      <div className="text-xs text-gray-400">{title}</div>
      <div className={`text-2xl font-bold mt-2 ${accent}`}>{value}</div>
    </div>
  );
}