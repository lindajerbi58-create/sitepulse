"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import { useTaskStore } from "@/store/useTaskStore";
import { useUserStore } from "@/store/useUserStore";
import { useProjectStore } from "@/store/useProjectStore";

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();

  const { tasks, addTask, updateTask } = useTaskStore() as any;
  const { users, currentUser } = useUserStore() as any;
  const { currentProjectId, projects } = useProjectStore() as any;

  const [mounted, setMounted] = useState(false);

  // task route id
  const routeTaskId = String((params as any)?.id || "");

  // local form states (parent task)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(""); // yyyy-mm-dd for input
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [status, setStatus] = useState<
    "Not Started" | "In Progress" | "On Hold" | "Complete"
  >("Not Started");

  // subtask form states
  const [subTitle, setSubTitle] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subDueDate, setSubDueDate] = useState("");
  const [subPriority, setSubPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [subAssigneeId, setSubAssigneeId] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const task = useMemo(() => {
    return (tasks || []).find(
      (t: any) => String(t.id || t._id) === String(routeTaskId)
    );
  }, [tasks, routeTaskId]);

  // fill form when task is found
  useEffect(() => {
    if (!task) return;

    setTitle(task.title || "");
    setDescription(task.description || "");

    // convert ISO date to yyyy-mm-dd for <input type="date" />
    const d = task.dueDate ? new Date(task.dueDate) : null;
    if (d && !isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setDueDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setDueDate("");
    }

    setPriority((task.priority as any) || "Medium");
    setStatus((task.status as any) || "Not Started");
  }, [task]);

  const activeProject = task
    ? projects?.find((p: any) => String(p.id) === String(task.projectId))
    : projects?.find((p: any) => String(p.id) === String(currentProjectId));

  const assignee = task
    ? users?.find((u: any) => String(u._id) === String(task.assigneeId))
    : null;

  const creator = task
    ? users?.find((u: any) => String(u._id) === String(task.createdById))
    : null;

  // ✅ permission: only assigned user can edit progress/status (as requested)
  const isAssignedToMe =
    task && currentUser
      ? String(task.assigneeId) === String(currentUser._id)
      : false;

  const isCreator =
    task && currentUser
      ? String(task.createdById) === String(currentUser._id)
      : false;

  const canEditTask = !!isAssignedToMe;

  // ✅ add subtasks only if task assigned to me
  const canAddSubtasks = !!isAssignedToMe;

  const teamMembers = useMemo(() => {
    if (!users || !currentUser) return [];

    const result = users.filter((u: any) => {
      const isMe = String(u._id) === String(currentUser._id);
      const reportsToMe = String(u.reportsTo || "") === String(currentUser._id);
      return isMe || reportsToMe;
    });

    console.log("teamMembers (me + reportsTo):", result);
    return result;
  }, [users, currentUser]);

  const subtasks = useMemo(() => {
    if (!task) return [];
    const parentKey = String(task.id || task._id);
    return (tasks || []).filter(
      (t: any) =>
        String(t.parentId) === parentKey &&
        String(t.projectId) === String(task.projectId)
    );
  }, [tasks, task]);

  // ✅ COMPUTED STATUS (recursive) — moved outside map so it can be reused everywhere
  const getComputedStatus = (item: any, allTasks: any[]): string => {
    const itemKey = String(item.id || item._id);

    const children = (allTasks || []).filter(
      (t: any) =>
        String(t.parentId || "") === itemKey &&
        String(t.projectId) === String(item.projectId)
    );

    // No children -> keep real status
    if (children.length === 0) {
      return item.status || "Not Started";
    }

    // Recursive children statuses
    const childStatuses = children.map((child: any) => getComputedStatus(child, allTasks));

    const allComplete = childStatuses.every((s) => s === "Complete");
    if (allComplete) return "Complete";

    const anyInProgress = childStatuses.some((s) => s === "In Progress");
    const anyOnHold = childStatuses.some((s) => s === "On Hold");
    const anyComplete = childStatuses.some((s) => s === "Complete");

    if (anyOnHold) return "On Hold";
    if (anyInProgress || anyComplete) return "In Progress";

    return item.status || "Not Started";
  };

  // ✅ progress uses computed status, not raw status
  const completedSubtasks = subtasks.filter(
    (st: any) => getComputedStatus(st, tasks || []) === "Complete"
  ).length;

  const progress =
    subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const handleUpdateTask = () => {
    if (!task) return;
    if (!canEditTask) {
      alert("You are not allowed to edit this task.");
      return;
    }
    if (!title.trim()) {
      alert("Task title is required.");
      return;
    }
    if (!dueDate) {
      alert("Due date is required.");
      return;
    }

    const taskKey = task.id || task._id;

    const updatedPayload = {
      ...task,
      id: task.id ?? task._id,
      _id: task._id,
      title: title.trim(),
      description: description.trim(),
      dueDate: new Date(dueDate).toISOString(),
      priority,
      status,
      // preserve fields:
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      createdById: task.createdById,
      parentId: task.parentId,
      totalTarget: task.totalTarget ?? 0,
      progress: task.progress ?? 0,
      createdAt: task.createdAt ?? new Date().toISOString(),
    };

    console.log("UPDATE TASK payload:", updatedPayload);

    if (typeof updateTask === "function") {
      updateTask(String(taskKey), updatedPayload);

      // ✅ if this task is a child, sync its parent too
      if (task.parentId) {
        syncParentStatusFromChildren(String(task.parentId));
      }

      alert("Task updated ✅");
      router.push(`/tasks/${String(taskKey)}`);
    } else {
      console.error("updateTask not found in useTaskStore");
      alert("updateTask method is missing in useTaskStore.");
    }
  };

  const handleAddSubtask = () => {
    if (!task) return;

    if (!canAddSubtasks) {
      alert("You can only add subtasks to tasks assigned to you.");
      return;
    }

    if (!subTitle.trim()) {
      alert("Subtask title is required.");
      return;
    }

    if (!subAssigneeId) {
      alert("Please choose a team member.");
      return;
    }

    if (!subDueDate) {
      alert("Please choose a due date.");
      return;
    }

    const parentTaskId = String(task.id || task._id);

    const newSubtask = {
      id: uuidv4(),
      title: subTitle.trim(),
      description: subDescription.trim(),
      projectId: task.projectId,
      assigneeId: String(subAssigneeId),
      createdById: String(currentUser?._id || task.createdById),
      dueDate: new Date(subDueDate).toISOString(),
      priority: subPriority,
      status: "Not Started",
      totalTarget: 0,
      progress: 0,
      parentId: parentTaskId,
      createdAt: new Date().toISOString(),
    };

    console.log("ADD SUBTASK payload:", newSubtask);

    if (typeof addTask === "function") {
      addTask(newSubtask);

      // reset form
      setSubTitle("");
      setSubDescription("");
      setSubDueDate("");
      setSubPriority("Medium");
      setSubAssigneeId("");

      // ✅ parent should become In Progress if it receives children (optional sync)
      syncParentStatusFromChildren(parentTaskId);

      alert("Subtask added ✅");
    } else {
      console.error("addTask not found in useTaskStore");
      alert("addTask method is missing in useTaskStore.");
    }
  };

  const handleSubtaskStatusChange = (
    st: any,
    newStatus: "Not Started" | "In Progress" | "On Hold" | "Complete"
  ) => {
    if (!currentUser) return;

    // ✅ only subtask assignee can change subtask status
    const isSubtaskAssignee = String(st.assigneeId) === String(currentUser._id);

    if (!isSubtaskAssignee) {
      alert("Only the assigned user can change this subtask status.");
      return;
    }

    if (typeof updateTask !== "function") {
      alert("updateTask method is missing in useTaskStore.");
      return;
    }

    const stKey = String(st.id || st._id);

    const updatedSubtask = {
      ...st,
      id: st.id ?? st._id,
      _id: st._id,
      status: newStatus,
    };

    console.log("UPDATE SUBTASK STATUS:", {
      subtask: st.title,
      subtaskId: stKey,
      oldStatus: st.status,
      newStatus,
      parentId: st.parentId,
    });

    updateTask(stKey, updatedSubtask);

    // ✅ recalc parent automatically
    if (st.parentId) {
      syncParentStatusFromChildren(String(st.parentId));
    }
  };

  const syncParentStatusFromChildren = (parentTaskId: string) => {
    if (typeof updateTask !== "function") return;

    const allTasks = tasks || [];

    // Find parent (can be task or subtask)
    const parentTask = allTasks.find(
      (t: any) => String(t.id || t._id) === String(parentTaskId)
    );

    if (!parentTask) return;

    // Find direct children
    const children = allTasks.filter(
      (t: any) =>
        String(t.parentId || "") === String(parentTaskId) &&
        String(t.projectId) === String(parentTask.projectId)
    );

    // no children => nothing to sync
    if (children.length === 0) return;

    // ✅ use computed status for nested subtasks (important)
    const completedCount = children.filter(
      (c: any) => getComputedStatus(c, allTasks) === "Complete"
    ).length;

    const allComplete = completedCount === children.length;

    // ✅ Auto parent status
    const nextStatus = allComplete ? "Complete" : "In Progress";

    // avoid useless update
    if (parentTask.status === nextStatus) return;

    const parentKey = String(parentTask.id || parentTask._id);

    const updatedParent = {
      ...parentTask,
      id: parentTask.id ?? parentTask._id,
      _id: parentTask._id,
      status: nextStatus,
    };

    console.log("AUTO SYNC PARENT STATUS:", {
      parentTitle: parentTask.title,
      parentId: parentKey,
      children: children.length,
      completedCount,
      nextStatus,
    });

    updateTask(parentKey, updatedParent);

    // ✅ Cascade upward if parent itself has a parent
    if (parentTask.parentId) {
      syncParentStatusFromChildren(String(parentTask.parentId));
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Loading edit page...
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
          <Link
            href="/tasks"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Back to Tasks
          </Link>
          <button
            onClick={() => router.refresh()}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-gray-400">Edit Task</p>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <p className="text-sm text-gray-400 mt-1">
            Project:{" "}
            <span className="text-blue-400">{activeProject?.name || task.projectId}</span>
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/tasks/${String(task.id || task._id)}`}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
          >
            ← Back to Details
          </Link>
          <Link
            href="/tasks"
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg"
          >
            Tasks List
          </Link>
        </div>
      </div>

      {/* Permission banners */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <p className="text-sm">
            <span className="text-gray-400">Assigned to:</span>{" "}
            <span className="font-medium">{assignee?.fullName || task.assigneeId}</span>
          </p>
          <p className="text-sm mt-1">
            <span className="text-gray-400">Created by:</span>{" "}
            <span className="font-medium">{creator?.fullName || task.createdById}</span>
          </p>
          <p className="text-sm mt-2">
            <span className="text-gray-400">Your access:</span>{" "}
            {canEditTask ? (
              <span className="text-green-400">✅ Can edit task</span>
            ) : (
              <span className="text-red-400">❌ Read only</span>
            )}
          </p>
          <p className="text-sm mt-1">
            <span className="text-gray-400">Subtasks:</span>{" "}
            {canAddSubtasks ? (
              <span className="text-green-400">✅ You can add subtasks</span>
            ) : (
              <span className="text-yellow-400">
                ⚠ Only the assignee can add subtasks
              </span>
            )}
          </p>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-2">Subtasks progress</p>

          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span className="text-blue-400 font-semibold">{progress}%</span>
          </div>

          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm text-gray-400 mt-2">
            {completedSubtasks} / {subtasks.length} completed
          </p>
        </div>
      </div>

      {/* Optional parent task edit form controls (you already have state/handler, if you want visible form add it here) */}

      {/* Add Subtask Form */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-5">Add Subtask</h2>

        {!canAddSubtasks ? (
          <p className="text-sm text-gray-400">
            You can only add subtasks to tasks assigned to you.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Subtask title</label>
              <input
                type="text"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
                placeholder="Enter subtask title"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea
                value={subDescription}
                onChange={(e) => setSubDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
                placeholder="Subtask description (optional)"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Assign to (team only)
              </label>
              <select
                value={subAssigneeId}
                onChange={(e) => setSubAssigneeId(e.target.value)}
                className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="">Select team member</option>
                {teamMembers.map((member: any) => (
                  <option key={String(member._id)} value={String(member._id)}>
                    {member.fullName} {member.role ? `(${member.role})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Due date</label>
              <input
                type="date"
                value={subDueDate}
                onChange={(e) => setSubDueDate(e.target.value)}
                className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Priority</label>
              <select
                value={subPriority}
                onChange={(e) => setSubPriority(e.target.value as any)}
                className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAddSubtask}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
              >
                + Add Subtask
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Subtasks */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-5">Existing Subtasks</h2>

        {subtasks.length === 0 ? (
          <p className="text-sm text-gray-400">No subtasks yet.</p>
        ) : (
          <div className="space-y-3">
            {subtasks.map((st: any) => {
              const stId = String(st.id || st._id);
              const stAssignee = users?.find(
                (u: any) => String(u._id) === String(st.assigneeId)
              );

              // ✅ only assignee can change subtask status
              const isSubtaskAssignee = currentUser
                ? String(st.assigneeId) === String(currentUser._id)
                : false;

              const canChangeSubtaskStatus = !!isSubtaskAssignee;

              // ✅ computed display status (recursive)
              const computedStStatus = getComputedStatus(st, tasks || []);

              return (
                <div
                  key={stId}
                  className="bg-[#0b1220] border border-gray-800 rounded-xl p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-medium">{st.title}</p>
                      <p className="text-sm text-gray-400">
                        Assigned: {stAssignee?.fullName || st.assigneeId}
                      </p>
                      <p className="text-sm text-gray-400">
                        Due: {st.dueDate ? new Date(st.dueDate).toLocaleDateString() : "N/A"}
                      </p>
                    </div>

                    <div className="text-sm flex flex-col md:items-end gap-2">
                      <div>
                        <span className="px-2 py-1 rounded bg-blue-600/20 text-blue-300 mr-2">
                          {st.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-gray-400 text-xs">Status</label>
                        <select
                          value={computedStStatus}
                          onChange={(e) =>
                            handleSubtaskStatusChange(
                              st,
                              e.target.value as
                                | "Not Started"
                                | "In Progress"
                                | "On Hold"
                                | "Complete"
                            )
                          }
                          disabled={!canChangeSubtaskStatus}
                          className="bg-[#111827] border border-gray-700 rounded px-2 py-1 text-gray-200 disabled:opacity-50"
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Complete">Complete</option>
                        </select>
                      </div>

                      {!canChangeSubtaskStatus && (
                        <p className="text-xs text-yellow-400">
                          Read only (You are not an assigned user !)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Optional save parent task button if you want to use handleUpdateTask visibly */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleUpdateTask}
          disabled={!canEditTask}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg"
        >
          Save Parent Task Changes
        </button>
      </div>
    </div>
  );
}