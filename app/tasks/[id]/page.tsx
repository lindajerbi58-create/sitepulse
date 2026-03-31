"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { predictDelay } from "@/lib/delayPredictor";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useDailyReportStore } from "@/store/useDailyReportStore";
import { useProcurementStore } from "@/store/useProcurementStore";

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
  totalTarget?: number;
  createdAt?: string;
  updatedAt?: string;
};

type User = {
  _id?: string;
  id?: string;
  fullName?: string;
  role?: string;
  reportsTo?: string | { _id?: string; id?: string } | null;
  department?: string;
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
  description?: string;
  status?: string;
};

type HistoryItem = {
  type: "created" | "updated" | "subtask";
  label: string;
  date: Date;
  userId?: string;
  href?: string;
};

export default function TaskDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { currentUser, setUsers, users } = useUserStore() as any;
  const { currentProjectId, setProjects, projects } = useProjectStore() as any;
  const { tasks, setTasks } = useTaskStore() as any;
  const { reports, setReports } = useDailyReportStore() as any;
  const { items: procurementItems, setItems: setProcurementItems } = useProcurementStore() as any;

  const routeTaskId = String((params as any)?.id || "");

  const [mounted, setMounted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState("");
  const [subtaskDueDate, setSubtaskDueDate] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState<
    "Low" | "Medium" | "High"
  >("Medium");
  const [subtaskStatus, setSubtaskStatus] = useState<
    "Not Started" | "In Progress" | "On Hold" | "Complete"
  >("Not Started");
  const [subtaskError, setSubtaskError] = useState("");
  const [subtaskSuccess, setSubtaskSuccess] = useState("");
  const [subtaskSaving, setSubtaskSaving] = useState(false);

  // New states for leaf task progress update
  const [progressInput, setProgressInput] = useState<number>(0);
  const [workNote, setWorkNote] = useState("");
  const [taskComment, setTaskComment] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const normalizeId = (value: any) =>
    String(value?._id || value?.id || value || "");

  const safeDate = (value: any) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const todayInputValue = new Date().toISOString().split("T")[0];

  const loadAllData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setPageError("");

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

      setTasks(
        Array.isArray(tasksData)
          ? tasksData
          : Array.isArray(tasksData?.tasks)
            ? tasksData.tasks
            : []

      );
      setUsers(Array.isArray(usersData) ? usersData : []);
      setReports(Array.isArray(dailyData) ? dailyData : []);
      setProcurementItems(Array.isArray(procurementData) ? procurementData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error: any) {
      console.error("TaskDetails loadAllData error:", error);
      setPageError(error?.message || "Unable to load task details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleProgressUpdate = async (isComplete = false) => {
    console.log("NEW HANDLEPROGRESSUPDATE RUNNING");
    if (!task || !currentUser) return;

    setSavingProgress(true);
    setProgressMessage("");

    const newProgress = isComplete ? 100 : progressInput;

    try {
      const taskId = String(task._id || task.id);
      const myId = normalizeId(currentUser._id || currentUser.id);

      const nextStatus = isComplete
        ? "Complete"
        : newProgress > 0
          ? "In Progress"
          : "Not Started";

      const taskRes = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: newProgress,
          status: nextStatus,
        }),
      });

      const taskData = await taskRes.json();

      if (!taskRes.ok) {
        throw new Error(taskData?.message || "Failed to update task");
      }

      const updatedTask = taskData;

      const safeTasks = Array.isArray(tasks)
        ? tasks
        : Array.isArray((tasks as any)?.tasks)
          ? (tasks as any).tasks
          : [];

      const mergedTask = {
        ...task,
        ...updatedTask,
        progress: updatedTask?.progress ?? newProgress,
        status: updatedTask?.status ?? nextStatus,
        updatedAt: updatedTask?.updatedAt || new Date().toISOString(),
      };

      const newTasks = safeTasks.map((t: any) =>
        String(t._id || t.id) === taskId ? mergedTask : t
      );

      setTasks(newTasks);
      setProgressInput(Number(mergedTask.progress || 0));

      const creatorId = normalizeId(task.createdById);

      // 🔔 notification (ne doit JAMAIS bloquer)
      try {
        if (creatorId && creatorId !== myId) {
          const notifRes = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: creatorId,
              taskId,
              senderId: myId,
              type: isComplete ? "task_completed" : "task_progress_updated",
              title: isComplete ? "Task Completed" : "Task Progress Updated",
              message: `${currentUser.fullName} updated progress to ${newProgress}% on "${task.title}".`,
            }),
          });

          console.log("notif status =", notifRes.status);
        }
      } catch (e) {
        console.log("notif error but continue", e);
      }
      console.log("🚀 DAILY START");

      // 🟢 DAILY REPORT (TRÈS IMPORTANT)
      console.log("🚀 sending daily report...");

      const today = new Date().toISOString().split("T")[0];

      const dailyRes = await fetch("/api/daily/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_ENTRY",
          userId: myId,
          reportDate: today,
          userFullName: currentUser.fullName || "",
          userRole: currentUser.role || "",
          entry: {
            taskId,
            taskTitle: task.title || "Untitled task",
            progress: newProgress,
            workDescription: workNote || "Updated progress",
            comment: taskComment || "",
          },
        }),
      });

      const dailyData = await dailyRes.json().catch(() => null);

      console.log("daily status =", dailyRes.status);
      console.log("daily response =", dailyData);

      if (!dailyRes.ok) {
        throw new Error(dailyData?.message || "Daily failed");
      }

      setWorkNote("");
      setTaskComment("");
      setProgressMessage("Progress saved successfully.");
    } catch (err: any) {
      console.error("handleProgressUpdate error:", err);
      setProgressMessage(err?.message || "Error updating task.");
    } finally {
      setSavingProgress(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    loadAllData();
  }, [mounted]);

  const task = useMemo(() => {
    const safeTasks = Array.isArray(tasks)
      ? tasks
      : Array.isArray((tasks as any)?.tasks)
        ? (tasks as any).tasks
        : [];

    const t = safeTasks.find(
      (t: any) => String(t.id || t._id) === String(routeTaskId)
    );

    if (t && progressInput === 0 && Number(t.progress) > 0) {
      setProgressInput(Number(t.progress));
    }

    return t;
  }, [tasks, routeTaskId]);

  const getComputedStatus = (
    item: any,
    allTasks: any[],
    visited = new Set<string>()
  ): "Not Started" | "In Progress" | "On Hold" | "Complete" => {
    const itemKey = String(item?.id || item?._id || "");

    if (!itemKey) {
      return (item.status || "Not Started") as any;
    }

    if (visited.has(itemKey)) {
      return (item.status || "Not Started") as any;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(itemKey);

    const children = (allTasks || []).filter(
      (t: any) =>
        String(t.parentId || "") === itemKey &&
        String(t.projectId || "") === String(item.projectId || "")
    );

    if (children.length === 0) {
      return (item.status || "Not Started") as any;
    }

    const childStatuses = children.map((child: any) =>
      getComputedStatus(child, allTasks, nextVisited)
    );

    const allComplete = childStatuses.every((s) => s === "Complete");
    if (allComplete) return "Complete";

    const anyOnHold = childStatuses.some((s) => s === "On Hold");
    const anyInProgress = childStatuses.some((s) => s === "In Progress");
    const anyComplete = childStatuses.some((s) => s === "Complete");

    if (anyOnHold) return "On Hold";
    if (anyInProgress || anyComplete) return "In Progress";

    return (item.status || "Not Started") as any;
  };

  const assignee = task
    ? users.find((u: any) => normalizeId(u) === normalizeId(task.assigneeId))
    : null;

  const creator = task
    ? users.find((u: any) => normalizeId(u) === normalizeId(task.createdById))
    : null;

  const activeProject = task
    ? projects.find((p: any) => normalizeId(p) === String(task.projectId || ""))
    : null;

  const blocked = task
    ? procurementItems.some(
      (p: any) =>
        normalizeId(p.relatedTaskId) === String(task.id || task._id) &&
        String(p.status || "") !== "Delivered"
    )
    : false;

  const delayRisk = task ? predictDelay(task, reports) : "N/A";

  const subtasks = task
    ? tasks.filter(
      (t: any) =>
        String(t.parentId || "") === String(task.id || task._id) &&
        String(t.projectId || "") === String(task.projectId || "")
    )
    : [];

  const completedSubtasks = subtasks.filter(
    (st: any) => getComputedStatus(st, tasks || []) === "Complete"
  ).length;

  const averageSubtaskProgress = useMemo(() => {
    if (!subtasks.length) return null;

    const total = subtasks.reduce((sum: number, st: any) => {
      const computed = getComputedStatus(st, tasks || []);
      if (computed === "Complete") return sum + 100;

      const rawProgress = Number(st.progress || 0);
      return sum + Math.min(Math.max(rawProgress, 0), 100);
    }, 0);

    return Math.round(total / subtasks.length);
  }, [subtasks, tasks]);

  const progress =
    subtasks.length > 0
      ? Number(averageSubtaskProgress || 0)
      : Number(task?.progress || 0);

  const computedTaskStatus = task
    ? getComputedStatus(task, tasks || [])
    : "Not Started";

  const teamMembers = useMemo(() => {
    if (!Array.isArray(users) || !currentUser) return [];

    const me = String(currentUser._id || currentUser.id || "");

    return users.filter((u: any) => {
      const uid = String(u?._id || u?.id || "");

      const reportsTo =
        u?.reportsTo && typeof u.reportsTo === "object"
          ? String(u.reportsTo?._id || u.reportsTo?.id || "")
          : String(u?.reportsTo || "");

      const isMe = uid === me;
      const reportsToMe = reportsTo === me;

      return isMe || reportsToMe;
    });
  }, [users, currentUser]);

  const canAddSubtask = !!(
    currentUser &&
    task &&
    (normalizeId(task.createdById) ===
      String(currentUser._id || currentUser.id || "") ||
      normalizeId(task.assigneeId) ===
      String(currentUser._id || currentUser.id || ""))
  );

  const historyItems = useMemo(() => {
    if (!task) return [];

    const items: HistoryItem[] = [];

    if (task.createdAt) {
      items.push({
        type: "created",
        label: "Task created",
        date: new Date(task.createdAt),
        userId: normalizeId(task.createdById),
      });
    }

    if (task.updatedAt && task.updatedAt !== task.createdAt) {
      items.push({
        type: "updated",
        label: "Task updated",
        date: new Date(task.updatedAt),
        userId: normalizeId(task.createdById),
      });
    }

    subtasks.forEach((st: any) => {
      if (st.createdAt) {
        items.push({
          type: "subtask",
          label: `Subtask added: ${st.title || "Untitled subtask"}`,
          date: new Date(st.createdAt),
          userId: normalizeId(st.createdById),
          href: `/tasks/${String(st.id || st._id)}`,
        });
      }
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [task, subtasks]);

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "Complete":
        return "bg-green-500/20 text-green-300";
      case "In Progress":
        return "bg-blue-500/20 text-blue-300";
      case "On Hold":
        return "bg-yellow-500/20 text-yellow-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const getPriorityBadgeClasses = (priority: string) => {
    switch (String(priority || "").toLowerCase()) {
      case "high":
        return "bg-red-500/20 text-red-300";
      case "medium":
        return "bg-orange-500/20 text-orange-300";
      default:
        return "bg-green-500/20 text-green-300";
    }
  };

  const getDelayRiskBadgeClasses = (risk: string) => {
    switch (String(risk || "").toLowerCase()) {
      case "high":
        return "bg-red-500/20 text-red-300";
      case "medium":
        return "bg-orange-500/20 text-orange-300";
      case "low":
        return "bg-green-500/20 text-green-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const handleAddSubtask = async () => {
    setSubtaskError("");
    setSubtaskSuccess("");

    if (!task) {
      setSubtaskError("Parent task not found.");
      return;
    }

    if (!currentUser?._id && !currentUser?.id) {
      setSubtaskError("Current user not loaded.");
      return;
    }

    if (!canAddSubtask) {
      setSubtaskError("You are not allowed to add subtasks to this task.");
      return;
    }

    if (!subtaskTitle.trim()) {
      setSubtaskError("Subtask title is required.");
      return;
    }

    if (!subtaskAssigneeId) {
      setSubtaskError("Please select a team member.");
      return;
    }

    if (!subtaskDueDate) {
      setSubtaskError("Please select a due date.");
      return;
    }

    const allowed = teamMembers.some(
      (m: any) => normalizeId(m) === String(subtaskAssigneeId)
    );

    if (!allowed) {
      setSubtaskError("Selected user is not in your team.");
      return;
    }

    const parentTaskId = String(task.id || task._id);
    const creatorId = String(currentUser._id || currentUser.id);

    const parentDueDate = task?.dueDate ? new Date(task.dueDate) : null;
    const chosenSubtaskDate = subtaskDueDate ? new Date(subtaskDueDate) : null;

    if (parentDueDate && chosenSubtaskDate && chosenSubtaskDate > parentDueDate) {
      setSubtaskError(
        "Subtask due date cannot be later than the parent task due date."
      );
      return;
    }

    const chosenInputDate = new Date(subtaskDueDate);
    const todayDate = new Date(todayInputValue);

    if (chosenInputDate < todayDate) {
      setSubtaskError("Subtask due date cannot be in the past.");
      return;
    }

    const newSubtask = {
      title: subtaskTitle.trim(),
      description: subtaskDescription.trim(),
      projectId: String(task.projectId || ""),
      assigneeId: String(subtaskAssigneeId),
      createdById: creatorId,
      dueDate: new Date(subtaskDueDate).toISOString(),
      priority: subtaskPriority,
      status: subtaskStatus,
      totalTarget: 0,
      progress: 0,
      parentId: parentTaskId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setSubtaskSaving(true);

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSubtask),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create subtask: ${text}`);
      }

      setSubtaskSuccess("Subtask added successfully ✅");
      setSubtaskTitle("");
      setSubtaskDescription("");
      setSubtaskAssigneeId("");
      setSubtaskDueDate("");
      setSubtaskPriority("Medium");
      setSubtaskStatus("Not Started");

      await loadAllData(true);
    } catch (error: any) {
      console.error("Add subtask error:", error);
      setSubtaskError(error?.message || "Failed to add subtask.");
    } finally {
      setSubtaskSaving(false);
    }
  };

  const projectTasks = useMemo(() => {
    if (!task) return [];

    const safeTasks = Array.isArray(tasks)
      ? tasks
      : Array.isArray((tasks as any)?.tasks)
        ? (tasks as any).tasks
        : [];

    return safeTasks.filter(
      (t: any) =>
        String(t.projectId || "") === String(task.projectId || "")
    );
  }, [tasks, task]);
  const directChildrenMap = useMemo(() => {
    const map = new Map<string, Task[]>();

    for (const t of projectTasks) {
      const parentKey = String(t.parentId || "");
      if (!map.has(parentKey)) {
        map.set(parentKey, []);
      }
      map.get(parentKey)!.push(t);
    }

    return map;
  }, [projectTasks]);

  const getDirectSubtasks = (taskId: string) => {
    return directChildrenMap.get(String(taskId || "")) || [];
  };

  const parentTask = useMemo(() => {
    if (!task?.parentId) return null;
    return projectTasks.find(
      (t: any) => String(t.id || t._id) === String(task.parentId)
    );
  }, [task, projectTasks]);

  const rootOfCurrentHierarchy = useMemo(() => {
    if (!task) return null;

    let current: any = task;
    let guard = 0;

    while (current?.parentId && guard < 30) {
      const parent = projectTasks.find(
        (t: any) => String(t.id || t._id) === String(current.parentId)
      );

      if (!parent) break;
      current = parent;
      guard++;
    }

    return current;
  }, [task, projectTasks]);

  const renderTaskNode = (
    node: Task,
    level = 0,
    visited = new Set<string>()
  ): React.ReactNode => {
    const nodeId = String(node.id || node._id || "");

    if (!nodeId || visited.has(nodeId)) return null;

    const nextVisited = new Set(visited);
    nextVisited.add(nodeId);

    const children = getDirectSubtasks(nodeId);
    const hasChildren = children.length > 0;

    const nodeAssignee = users.find(
      (u: any) => normalizeId(u) === normalizeId(node.assigneeId)
    );

    const nodeComputedStatus = getComputedStatus(node, tasks || []);
    const isCurrentTask = nodeId === String(task?.id || task?._id || "");

    const rawProgress = Number(node.progress || 0);
    const displayProgress =
      hasChildren && nodeId === String(task?.id || task?._id || "")
        ? progress
        : Math.min(Math.max(rawProgress, 0), 100);

    return (
      <div key={nodeId} className="mt-3">
        <div
          className={`rounded-xl border p-4 ${isCurrentTask
            ? "border-cyan-500 bg-cyan-500/10"
            : "border-gray-800 bg-[#0b1220]"
            }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {node.title || "Untitled task"}
                </span>

                {isCurrentTask && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300">
                    Current Task
                  </span>
                )}

                {node.parentId ? (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-violet-500/20 text-violet-300">
                    Subtask
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-slate-500/20 text-slate-300">
                    Parent Task
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-3">
                <span>ID: {nodeId}</span>
                <span>Assigned: {nodeAssignee?.fullName || "Unassigned"}</span>
                <span>
                  Due:{" "}
                  {node.dueDate
                    ? new Date(node.dueDate).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>

              {hasChildren && (
                <p className="text-sm text-cyan-300 mt-3">
                  This task has {children.length} subtask
                  {children.length > 1 ? "s" : ""}. They are shown below in the
                  hierarchy.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs px-3 py-1 rounded-full ${getStatusBadgeClasses(
                  nodeComputedStatus
                )}`}
              >
                {nodeComputedStatus}
              </span>

              <span
                className={`text-xs px-3 py-1 rounded-full ${getPriorityBadgeClasses(
                  String(node.priority || "Low")
                )}`}
              >
                {node.priority || "No Priority"}
              </span>

              <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                {displayProgress}%
              </span>

              <button
                onClick={() => router.push(`/tasks/${nodeId}`)}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg"
              >
                Open
              </button>
            </div>
          </div>
        </div>

        {hasChildren && (
          <div className="border-l border-gray-700 ml-3 pl-2">
            {children.map((child: any) =>
              renderTaskNode(child, level + 1, nextVisited)
            )}
          </div>
        )}
      </div>
    );
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Loading task details...
      </div>
    );
  }

  if (!routeTaskId) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex flex-col items-center justify-center gap-4">
        <p>Invalid task id.</p>
        <Link href="/tasks" className="bg-blue-600 px-4 py-2 rounded-lg">
          Back to Tasks
        </Link>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-semibold">Task not found</p>
        <p className="text-sm text-gray-400 text-center">
          The task may not exist in the database, or the id does not match.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => loadAllData(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg"
          >
            Refresh
          </button>

          <Link
            href="/tasks"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Back to Tasks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-gray-400">Task Details</p>
          <h1 className="text-2xl font-bold mt-1">{task.title}</h1>

          <div className="flex flex-wrap gap-2 mt-3">
            <span
              className={`text-xs px-3 py-1 rounded-full ${getStatusBadgeClasses(
                computedTaskStatus
              )}`}
            >
              {computedTaskStatus}
            </span>

            <span
              className={`text-xs px-3 py-1 rounded-full ${getPriorityBadgeClasses(
                String(task.priority || "Low")
              )}`}
            >
              {task.priority || "No Priority"}
            </span>

            <span
              className={`text-xs px-3 py-1 rounded-full ${getDelayRiskBadgeClasses(
                String(delayRisk)
              )}`}
            >
              Delay Risk: {String(delayRisk)}
            </span>

            {blocked && (
              <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-300">
                Waiting for Materials
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <Link
            href="/tasks"
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
          >
            ← Back
          </Link>

          <Link
            href={`/tasks/${String(task.id || task._id)}/edit`}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
          >
            Edit Task
          </Link>
        </div>
      </div>

      {pageError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {pageError}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">General Information</h2>

          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-400">Task ID:</span>{" "}
              <span className="text-blue-400">{String(task.id || task._id)}</span>
            </p>

            <p>
              <span className="text-gray-400">Description:</span>{" "}
              {task.description || "No description"}
            </p>

            <p>
              <span className="text-gray-400">Status:</span>{" "}
              <span className="font-medium">{computedTaskStatus}</span>
              {computedTaskStatus !== (task.status || "Not Started") && (
                <span className="ml-2 text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">
                  auto
                </span>
              )}
            </p>

            <p>
              <span className="text-gray-400">Raw Status (stored):</span>{" "}
              <span className="font-medium text-gray-300">
                {task.status || "Not Started"}
              </span>
            </p>

            <p>
              <span className="text-gray-400">Priority:</span>{" "}
              <span className="font-medium">{task.priority || "N/A"}</span>
            </p>

            <p>
              <span className="text-gray-400">Due Date:</span>{" "}
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}
            </p>

            <p>
              <span className="text-gray-400">Project:</span>{" "}
              {activeProject?.name || "Unnamed Project"}
            </p>

            <p>
              <span className="text-gray-400">Displayed Progress:</span>{" "}
              <span className="font-medium text-blue-300">{progress}%</span>
            </p>

            {task.parentId && (
              <p>
                <span className="text-gray-400">Parent Task ID:</span>{" "}
                <Link
                  href={`/tasks/${String(task.parentId)}`}
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  {String(task.parentId)}
                </Link>
              </p>
            )}

            {task.updatedAt && (
              <p>
                <span className="text-gray-400">Updated At:</span>{" "}
                {new Date(task.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Assignment & Risk</h2>

          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-400">Assigned To:</span>{" "}
              {assignee?.fullName || "Unassigned"}
            </p>

            <p>
              <span className="text-gray-400">Created By:</span>{" "}
              {creator?.fullName || "Unknown"}
            </p>

            <p>
              <span className="text-gray-400">Materials:</span>{" "}
              {blocked ? (
                <span className="text-red-400">🚫 Waiting for Materials</span>
              ) : (
                <span className="text-green-400">✅ OK</span>
              )}
            </p>

            <p>
              <span className="text-gray-400">Delay Risk:</span>{" "}
              <span>{String(delayRisk)}</span>
            </p>

            <p>
              <span className="text-gray-400">Created At:</span>{" "}
              {task.createdAt ? new Date(task.createdAt).toLocaleString() : "N/A"}
            </p>

            <p>
              <span className="text-gray-400">Can Add Subtask:</span>{" "}
              {canAddSubtask ? (
                <span className="text-green-400">Yes</span>
              ) : (
                <span className="text-red-400">No</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {subtasks.length === 0 && String(currentUser?._id || currentUser?.id) === normalizeId(task?.assigneeId) && (
        <div className="mt-6 bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4">Update Progress</h2>

          {computedTaskStatus === "Complete" || Number(task?.progress) >= 100 ? (
            <div className="flex items-center gap-3 text-green-400 bg-green-500/10 p-5 rounded-xl border border-green-500/30">
              <span className="text-3xl">✓</span>
              <span className="font-semibold text-lg">This task is completed (100%).</span>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Progress: <span className="text-blue-400">{progressInput}%</span></label>
                <input
                  type="range"
                  min="0" max="100"
                  value={progressInput}
                  onChange={(e) => setProgressInput(Number(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">What did you do? (Work Description)</label>
                <input
                  type="text"
                  value={workNote}
                  onChange={(e) => setWorkNote(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g. Assembled valve part A..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Optional Comment</label>
                <textarea
                  value={taskComment}
                  onChange={(e) => setTaskComment(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Any issues or extra notes?"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => handleProgressUpdate(false)}
                  disabled={savingProgress}
                  className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold disabled:opacity-50 transition w-full md:w-auto"
                >
                  {savingProgress ? "Saving..." : "Save Progress"}
                </button>
                {progressMessage && (
                  <p className="text-sm text-cyan-300 mt-3">{progressMessage}</p>
                )}
                <button
                  onClick={() => handleProgressUpdate(true)}
                  disabled={savingProgress}
                  className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition w-full md:w-auto"
                >
                  ✓ Mark Complete
                </button>
              </div>
              {progressMessage && (
                <p className="text-sm text-cyan-300 mt-3">{progressMessage}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Task Hierarchy</h2>

        {parentTask && (
          <div className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
            This task is a subtask of{" "}
            <Link
              href={`/tasks/${String(parentTask.id || parentTask._id)}`}
              className="underline text-violet-300 hover:text-violet-200"
            >
              {parentTask.title || "Untitled parent task"}
            </Link>
            .
          </div>
        )}

        {rootOfCurrentHierarchy ? (
          <div>
            <p className="text-sm text-gray-400 mb-4">
              Tasks and subtasks are displayed below as a hierarchy. Each level
              is slightly indented under its parent task.
            </p>
            {renderTaskNode(rootOfCurrentHierarchy)}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No hierarchy available for this task.
          </p>
        )}
      </div>

      <div className="mt-6 bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Add Subtask</h2>

        {!canAddSubtask && (
          <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            You can view this task, but you are not allowed to add subtasks to it.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">Subtask Title</label>
            <input
              type="text"
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder="Enter subtask title"
              disabled={!canAddSubtask || subtaskSaving}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">
              Description (optional)
            </label>
            <textarea
              value={subtaskDescription}
              onChange={(e) => setSubtaskDescription(e.target.value)}
              placeholder="Enter subtask description"
              rows={3}
              disabled={!canAddSubtask || subtaskSaving}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Assign to (team only)
            </label>
            <select
              value={subtaskAssigneeId}
              onChange={(e) => setSubtaskAssigneeId(e.target.value)}
              disabled={!canAddSubtask || subtaskSaving}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-60"
            >
              <option value="">
                {teamMembers.length === 0
                  ? "No team members found"
                  : "Select team member"}
              </option>

              {teamMembers.map((member: any) => (
                <option
                  key={String(member._id || member.id)}
                  value={String(member._id || member.id)}
                >
                  {member.fullName} {member.role ? `(${member.role})` : ""}
                </option>
              ))}
            </select>

            {teamMembers.length === 0 && (
              <p className="text-xs text-yellow-400 mt-2">
                No team members found from reportsTo.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Due Date</label>
            <input
              type="date"
              value={subtaskDueDate}
              onChange={(e) => setSubtaskDueDate(e.target.value)}
              min={todayInputValue}
              max={
                task?.dueDate
                  ? new Date(task.dueDate).toISOString().split("T")[0]
                  : undefined
              }
              disabled={!canAddSubtask || subtaskSaving}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-60"
            />
            {task?.dueDate && (
              <p className="text-xs text-gray-500 mt-2">
                Must be on or before{" "}
                {new Date(task.dueDate).toLocaleDateString()}.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Priority</label>
            <select
              value={subtaskPriority}
              onChange={(e) => setSubtaskPriority(e.target.value as any)}
              disabled={!canAddSubtask || subtaskSaving}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-60"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Initial Status
            </label>
            <select
              value={subtaskStatus}
              onChange={(e) => setSubtaskStatus(e.target.value as any)}
              disabled={!canAddSubtask || subtaskSaving}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 disabled:opacity-60"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
        </div>

        {subtaskError && (
          <p className="text-sm text-red-400 mt-4">{subtaskError}</p>
        )}

        {subtaskSuccess && (
          <p className="text-sm text-green-400 mt-4">{subtaskSuccess}</p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleAddSubtask}
            disabled={!canAddSubtask || subtaskSaving}
            className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {subtaskSaving ? "Adding..." : "+ Add Subtask"}
          </button>

          <button
            onClick={() => {
              setSubtaskTitle("");
              setSubtaskDescription("");
              setSubtaskAssigneeId("");
              setSubtaskDueDate("");
              setSubtaskPriority("Medium");
              setSubtaskStatus("Not Started");
              setSubtaskError("");
              setSubtaskSuccess("");
            }}
            disabled={subtaskSaving}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-6 bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Subtasks Progress</h2>

        {subtasks.length > 0 ? (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Progress</span>
              <span className="text-blue-400 font-semibold">{progress}%</span>
            </div>

            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-sm text-gray-400 mt-3">
              {completedSubtasks} / {subtasks.length} completed
            </p>

            <div className="mt-4 space-y-2">
              {subtasks.map((st: any) => {
                const stAssignee = users.find(
                  (u: any) => normalizeId(u) === normalizeId(st.assigneeId)
                );

                const computedStStatus = getComputedStatus(st, tasks || []);
                const rawStStatus = st.status || "Not Started";

                return (
                  <div
                    key={String(st.id || st._id)}
                    className="bg-[#0b1220] border border-gray-800 rounded-lg px-4 py-3 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{st.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Assigned: {stAssignee?.fullName || "Unassigned"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">
                        Subtask
                      </span>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${getStatusBadgeClasses(
                            computedStStatus
                          )}`}
                        >
                          {computedStStatus}
                        </span>
                        {computedStStatus !== rawStStatus && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                            auto
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          router.push(`/tasks/${String(st.id || st._id)}`)
                        }
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">No subtasks for this task.</p>
        )}
      </div>

      <div className="mt-6 bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">History</h2>

        {historyItems.length === 0 ? (
          <p className="text-sm text-gray-400">No history available for this task.</p>
        ) : (
          <div className="space-y-3">
            {historyItems.map((item: HistoryItem, index: number) => {
              const actor = users.find(
                (u: any) => normalizeId(u) === String(item.userId || "")
              );

              return (
                <div
                  key={`${item.type}-${index}`}
                  className="bg-[#0b1220] border border-gray-800 rounded-lg px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="hover:underline text-blue-400"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          item.label
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {actor?.fullName || "Unknown user"}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {item.date.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}