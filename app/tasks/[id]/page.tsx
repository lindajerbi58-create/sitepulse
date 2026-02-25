"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTaskStore } from "@/store/useTaskStore";
import { useUserStore } from "@/store/useUserStore";
import { useDailyReportStore } from "@/store/useDailyReportStore";
import { useProcurementStore } from "@/store/useProcurementStore";
import { useProjectStore } from "@/store/useProjectStore";
import { predictDelay } from "@/lib/delayPredictor";

export default function TaskDetailsPage() {
  const router = useRouter();
  const params = useParams();

  // ✅ keep everything + add addTask if available in your store
  const taskStore: any = useTaskStore();
  const { tasks } = taskStore;
  const addTask = taskStore?.addTask; // if your store has addTask()

  const { users } = useUserStore();
  const currentUser = useUserStore((state: any) => state.currentUser);

  const { reports } = useDailyReportStore();
  const { items: procurementItems } = useProcurementStore();
  const { currentProjectId, projects } = useProjectStore();

  const [mounted, setMounted] = useState(false);

  // ✅ Subtask form states (ADDED)
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState("");
  const [subtaskDueDate, setSubtaskDueDate] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [subtaskStatus, setSubtaskStatus] = useState<"Not Started" | "In Progress" | "On Hold" | "Complete">("Not Started");
  const [subtaskError, setSubtaskError] = useState("");
  const [subtaskSuccess, setSubtaskSuccess] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const routeTaskId = String((params as any)?.id || "");

  console.log("=== TASK DETAILS PAGE RENDER ===");
  console.log("mounted:", mounted);
  console.log("params:", params);
  console.log("routeTaskId:", routeTaskId);
  console.log("currentProjectId:", currentProjectId);
  console.log("currentUser:", currentUser);
  console.log("tasks length:", tasks?.length);
  console.log(
    "tasks ids preview:",
    (tasks || []).map((t: any) => ({
      title: t.title,
      id: t.id,
      _id: t._id,
      projectId: t.projectId,
      parentId: t.parentId,
      status: t.status,
    }))
  );

  const task = useMemo(() => {
    return (tasks || []).find(
      (t: any) => String(t.id || t._id) === String(routeTaskId)
    );
  }, [tasks, routeTaskId]);

  console.log("found task:", task);

  // ✅ ADDED: recursive computed status (task/subtask/sub-subtask...)
  const getComputedStatus = (item: any, allTasks: any[]): "Not Started" | "In Progress" | "On Hold" | "Complete" => {
    const itemKey = String(item?.id || item?._id || "");

    const children = (allTasks || []).filter(
      (t: any) =>
        String(t.parentId || "") === itemKey &&
        String(t.projectId) === String(item.projectId)
    );

    // no children => return real status
    if (children.length === 0) {
      return (item.status || "Not Started") as any;
    }

    const childStatuses = children.map((child: any) => getComputedStatus(child, allTasks));

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
    ? users.find((u: any) => String(u._id || u.id) === String(task.assigneeId))
    : null;

  const creator = task
    ? users.find((u: any) => String(u._id || u.id) === String(task.createdById))
    : null;

  const activeProject = task
    ? projects.find((p: any) => String(p.id) === String(task.projectId))
    : null;

  // ✅ FIXED id/_id comparison (kept your logic, corrected _id usage)
  const blocked = task
    ? procurementItems.some(
        (p: any) =>
          String(p.relatedTaskId) === String(task.id || task._id) &&
          p.status !== "Delivered"
      )
    : false;

  const delayRisk = task ? predictDelay(task, reports) : "N/A";

  // ✅ FIXED id/_id comparison for subtasks
  const subtasks = task
    ? tasks.filter(
        (t: any) =>
          String(t.parentId) === String(task.id || task._id) &&
          String(t.projectId) === String(task.projectId)
      )
    : [];

  // ✅ CHANGED: progress based on computed status (recursive)
  const completedSubtasks = subtasks.filter(
    (st: any) => getComputedStatus(st, tasks || []) === "Complete"
  ).length;

  const progress =
    subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  // ✅ ADDED: displayed/computed status of current task itself
  const computedTaskStatus = task ? getComputedStatus(task, tasks || []) : "Not Started";

  // ✅ TEAM ONLY for subtask assignment (ADDED)
  // "Son équipe" = me + users who report to me
  const teamMembers = useMemo(() => {
    if (!users || !currentUser) return [];

    const result = users.filter((u: any) => {
      const uid = String(u._id || u.id || "");
      const me = String(currentUser._id || currentUser.id || "");
      const reportsTo = String(u.reportsTo || "");

      const isMe = uid === me;
      const reportsToMe = reportsTo === me;

      // optional: same project check if user has projectId
      // const sameProject = String(u.projectId || "") === String(task?.projectId || "");

      return isMe || reportsToMe;
    });

    console.log("teamMembers (me + reportsTo):", result);
    return result;
  }, [users, currentUser, task]);

  // ✅ ADD SUBTASK handler (ADDED)
  const handleAddSubtask = () => {
    setSubtaskError("");
    setSubtaskSuccess("");

    console.log("=== ADD SUBTASK CLICK ===");
    console.log("parent task:", task);
    console.log("currentUser:", currentUser);
    console.log("subtask form:", {
      subtaskTitle,
      subtaskDescription,
      subtaskAssigneeId,
      subtaskDueDate,
      subtaskPriority,
      subtaskStatus,
    });

    if (!task) {
      setSubtaskError("Parent task not found.");
      return;
    }

    if (!currentUser?._id && !currentUser?.id) {
      setSubtaskError("Current user not loaded.");
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

    // ✅ ensure selected assignee is in team only
    const allowed = teamMembers.some(
      (m: any) => String(m._id || m.id) === String(subtaskAssigneeId)
    );

    if (!allowed) {
      setSubtaskError("Selected user is not in your team.");
      return;
    }

    const parentTaskId = String(task.id || task._id);
    const creatorId = String(currentUser._id || currentUser.id);

    const newSubtask: any = {
      // include both id and _id compatibility depending on your UI/store usage
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      title: subtaskTitle.trim(),
      description: subtaskDescription.trim(),
      projectId: String(task.projectId),
      assigneeId: String(subtaskAssigneeId),
      createdById: creatorId,
      dueDate: new Date(subtaskDueDate).toISOString(),
      priority: subtaskPriority,
      status: subtaskStatus,
      totalTarget: 0,
      progress: 0,
      parentId: parentTaskId,
      createdAt: new Date().toISOString(),
    };

    console.log("newSubtask payload:", newSubtask);

    try {
      if (typeof addTask === "function") {
        addTask(newSubtask);
        console.log("Subtask added via useTaskStore.addTask()");
      } else {
        console.warn("addTask() not found in useTaskStore. Subtask not persisted.");
        setSubtaskError("addTask() not found in task store. Please send me your useTaskStore code and I’ll wire it exactly.");
        return;
      }

      setSubtaskSuccess("Subtask added successfully ✅");
      setSubtaskTitle("");
      setSubtaskDescription("");
      setSubtaskAssigneeId("");
      setSubtaskDueDate("");
      setSubtaskPriority("Medium");
      setSubtaskStatus("Not Started");
    } catch (error: any) {
      console.error("Add subtask error:", error);
      setSubtaskError(error?.message || "Failed to add subtask.");
    }
  };

  if (!mounted) {
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
          The task may not be loaded yet, or the id does not match.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => router.refresh()}
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-gray-400">Task Details</p>
          <h1 className="text-2xl font-bold mt-1">{task.title}</h1>
        </div>

        <div className="flex gap-3">
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
              <span className="font-medium text-gray-300">{task.status}</span>
            </p>

            <p>
              <span className="text-gray-400">Priority:</span>{" "}
              <span className="font-medium">{task.priority}</span>
            </p>

            <p>
              <span className="text-gray-400">Due Date:</span>{" "}
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A"}
            </p>

            <p>
              <span className="text-gray-400">Project:</span>{" "}
              {activeProject?.name || task.projectId}
            </p>

            {/* ✅ ADDED: show if this task is itself a subtask */}
            {task.parentId && (
              <p>
                <span className="text-gray-400">Parent Task ID:</span>{" "}
                <span className="text-cyan-400">{String(task.parentId)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Assignment & Risk</h2>

          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-400">Assigned To:</span>{" "}
              {assignee?.fullName || task.assigneeId}
            </p>

            <p>
              <span className="text-gray-400">Created By:</span>{" "}
              {creator?.fullName || task.createdById}
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
              <span>{delayRisk}</span>
            </p>

            <p>
              <span className="text-gray-400">Created At:</span>{" "}
              {task.createdAt ? new Date(task.createdAt).toLocaleString() : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* ✅ ADDED: ADD SUBTASK FORM (kept everything else) */}
      <div className="mt-6 bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Add Subtask</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">Subtask Title</label>
            <input
              type="text"
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder="Enter subtask title"
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">Description (optional)</label>
            <textarea
              value={subtaskDescription}
              onChange={(e) => setSubtaskDescription(e.target.value)}
              placeholder="Enter subtask description"
              rows={3}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Assign to (team only)</label>
            <select
              value={subtaskAssigneeId}
              onChange={(e) => setSubtaskAssigneeId(e.target.value)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="">
                {teamMembers.length === 0 ? "No team members found" : "Select team member"}
              </option>

              {teamMembers.map((member: any) => (
                <option key={String(member._id || member.id)} value={String(member._id || member.id)}>
                  {member.fullName} {member.role ? `(${member.role})` : ""}
                </option>
              ))}
            </select>

            {teamMembers.length === 0 && (
              <p className="text-xs text-yellow-400 mt-2">
                No team members found from reportsTo. Check users.reportsTo values.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Due Date</label>
            <input
              type="date"
              value={subtaskDueDate}
              onChange={(e) => setSubtaskDueDate(e.target.value)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Priority</label>
            <select
              value={subtaskPriority}
              onChange={(e) => setSubtaskPriority(e.target.value as any)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Initial Status</label>
            <select
              value={subtaskStatus}
              onChange={(e) => setSubtaskStatus(e.target.value as any)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
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
            className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg"
          >
            + Add Subtask
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
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
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
                  (u: any) => String(u._id || u.id) === String(st.assigneeId)
                );

                // ✅ ADDED: computed status for display
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
                        Assigned: {stAssignee?.fullName || st.assigneeId}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">
                        Subtask
                      </span>

                      {/* ✅ show computed status */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">{computedStStatus}</span>
                        {computedStStatus !== rawStStatus && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                            auto
                          </span>
                        )}
                      </div>

                      {/* ✅ quick open subtask details */}
                      <button
                        onClick={() => router.push(`/tasks/${String(st.id || st._id)}`)}
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
    </div>
  );
}