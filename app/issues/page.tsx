"use client";

import { useEffect, useMemo, useState } from "react";
import { useIssueStore } from "@/store/useIssueStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useUserStore } from "@/store/useUserStore";
import { useProjectStore } from "@/store/useProjectStore";
import Link from "next/link";

const ISSUE_CATEGORIES = [
  "Material Delay",
  "Worker Conflict",
  "Equipment Failure",
  "Quality Problem",
  "Safety Issue",
  "Supplier Problem",
  "Budget Problem",
  "Design Change",
  "Dependency Blocked",
  "Weather Delay",
  "Other",
] as const;

type TaskStatus = "Not Started" | "In Progress" | "On Hold" | "Complete";

type Task = {
  _id?: string;
  id?: string;
  title?: string;
  projectId?: string;
  assigneeId?: string | { _id?: string; id?: string };
  createdById?: string | { _id?: string; id?: string };
  status?: TaskStatus | string;
};

type User = {
  _id?: string;
  id?: string;
  fullName?: string;
  role?: string;
  reportsTo?: string | { _id?: string; id?: string } | null;
};

type Project = {
  _id?: string;
  id?: string;
  name?: string;
};

export default function IssuesPage() {
 const { issues, updateIssue, addIssue, setIssues } = useIssueStore();
  const { tasks } = useTaskStore();
  const { users, currentUser } = useUserStore() as any;
  const { projects, setProjects } = useProjectStore() as any;

  const today = new Date();
  const todayInput = new Date().toISOString().split("T")[0];

  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [createError, setCreateError] = useState("");

  const normalizeId = (value: any) =>
    String(value?._id || value?.id || value || "");

  useEffect(() => {
    const fetchIssues = async () => {
  try {
    const res = await fetch("/api/issues", { cache: "no-store" });
    const data = await res.json();

    if (Array.isArray(data)) {
      setIssues(
        data.map((issue: any) => ({
          ...issue,
          id: issue._id,
        }))
      );
    } else {
      setIssues([]);
    }
  } catch (err) {
    console.error("Issue fetch failed", err);
    setIssues([]);
  }
};

    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Project fetch failed", err);
      }
    };

    fetchIssues();
    fetchProjects();
  }, [setIssues, setProjects]);

  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  const myVisibleTasks = useMemo(() => {
    return (tasks || []).filter((task: Task) => {
      const assigneeId = normalizeId(task.assigneeId);
      const creatorId = normalizeId(task.createdById);
      return assigneeId === currentUserId || creatorId === currentUserId;
    });
  }, [tasks, currentUserId]);

  const myProjectIds = useMemo(() => {
    const ids = new Set<string>();
    myVisibleTasks.forEach((task: Task) => {
      if (task.projectId) ids.add(String(task.projectId));
    });
    return Array.from(ids);
  }, [myVisibleTasks]);

  const myProjects = useMemo(() => {
    return (projects || []).filter((project: Project) =>
      myProjectIds.includes(normalizeId(project))
    );
  }, [projects, myProjectIds]);

  const directSuperior = useMemo(() => {
    if (!currentUser) return null;

    const reportsTo =
      currentUser?.reportsTo && typeof currentUser.reportsTo === "object"
        ? String(currentUser.reportsTo?._id || currentUser.reportsTo?.id || "")
        : String(currentUser?.reportsTo || "");

    return (users || []).find((u: User) => normalizeId(u) === reportsTo) || null;
  }, [currentUser, users]);

  const [form, setForm] = useState({
    projectId: "",
    taskId: "",
    title: "",
    category: "",
    customCategory: "",
    priority: "Medium",
    description: "",
    dueDate: todayInput,
  });

  const filteredTasksByProject = useMemo(() => {
    if (!form.projectId) return [];
    return myVisibleTasks.filter(
      (task: Task) => String(task.projectId || "") === String(form.projectId)
    );
  }, [form.projectId, myVisibleTasks]);
const selectedTask = useMemo(() => {
  return filteredTasksByProject.find(
    (task: Task) => normalizeId(task) === String(form.taskId)
  );
}, [filteredTasksByProject, form.taskId]);
 const uniqueIssues = useMemo(() => {
  const map = new Map();

  for (const issue of issues || []) {
    const key = String(issue._id || issue.id || "");
    if (key && !map.has(key)) {
      map.set(key, issue);
    }
  }

  return Array.from(map.values());
}, [issues]);

const openIssues = uniqueIssues.filter((i: any) => i.status === "Open");
const resolvedIssues = uniqueIssues.filter((i: any) => i.status === "Resolved");
const sortIssuesByTaskCompletion = (issueList: any[]) => {
  return [...issueList].sort((a, b) => {
    const taskA = (tasks || []).find(
      (t: Task) => normalizeId(t) === String(a.taskId || "")
    );
    const taskB = (tasks || []).find(
      (t: Task) => normalizeId(t) === String(b.taskId || "")
    );

    const aCompleted = taskA?.status === "Complete" ? 1 : 0;
    const bCompleted = taskB?.status === "Complete" ? 1 : 0;

    return aCompleted - bCompleted;
  });
};
const sortedOpenIssues = useMemo(() => {
  return sortIssuesByTaskCompletion(openIssues);
}, [openIssues, tasks]);

const sortedResolvedIssues = useMemo(() => {
  return sortIssuesByTaskCompletion(resolvedIssues);
}, [resolvedIssues, tasks]);
  const resetForm = () => {
    setForm({
      projectId: "",
      taskId: "",
      title: "",
      category: "",
      customCategory: "",
      priority: "Medium",
      description: "",
      dueDate: todayInput,
    });
    setCreateError("");
  };

  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-600/20 text-red-400";
      case "Medium":
        return "bg-yellow-600/20 text-yellow-400";
      default:
        return "bg-green-600/20 text-green-400";
    }
  };


  const handleCreateIssue = async () => {
    try {
      setLoadingCreate(true);
      setCreateError("");

      if (!currentUserId) {
        throw new Error("Current user not found");
      }

      if (!form.projectId) {
        throw new Error("Please select a project");
      }

      if (!form.taskId) {
        throw new Error("Please select a task");
      }

      if (!form.title.trim()) {
        throw new Error("Please enter an issue title");
      }

      if (!form.category) {
        throw new Error("Please select a category");
      }

      if (form.category === "Other" && !form.customCategory.trim()) {
        throw new Error("Please enter a custom category");
      }

      if (!form.description.trim()) {
        throw new Error("Please enter a description");
      }

      if (!form.dueDate) {
        throw new Error("Please select a due date");
      }

      if (new Date(form.dueDate) < new Date(todayInput)) {
        throw new Error("Due date cannot be in the past");
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        customCategory: form.category === "Other" ? form.customCategory.trim() : "",
        priority: form.priority,
        taskId: form.taskId,
        projectId: form.projectId,
        createdById: currentUserId,
        ownerId: normalizeId(directSuperior),
        dueDate: new Date(form.dueDate).toISOString(),
      };

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const created = await res.json();

      if (!res.ok) {
        throw new Error(created?.message || "Failed to create issue");
      }

      addIssue({
        ...created,
        id: created._id,
      });

      const projectName =
        myProjects.find((p: Project) => normalizeId(p) === form.projectId)?.name ||
        "Unknown project";

      const taskTitle =
        myVisibleTasks.find((t: Task) => normalizeId(t) === form.taskId)?.title ||
        "Unknown task";

      if (normalizeId(directSuperior)) {
        await fetch("/api/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: normalizeId(directSuperior),
            senderId: currentUserId,
            type: "issue_created",
            title: "New Issue Reported",
            message: `${currentUser?.fullName || "A user"} reported a ${form.priority} priority issue on task "${taskTitle}" in project "${projectName}".`,
            issueId: created._id,
            taskId: form.taskId,
          }),
        }).catch((err) => {
          console.error("Notification send failed", err);
        });
      }

      resetForm();
      setShowCreateModal(false);
    } catch (error: any) {
      setCreateError(error?.message || "Failed to create issue");
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
     <div className="flex justify-between items-center mb-8">
  <div>
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-3"
    >
      <span className="text-lg">←</span>
      <span>Back to Dashboard</span>
    </Link>

    <h1 className="text-2xl font-bold">Issues</h1>
  </div>

  <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
          >
            + Report Issue
          </button>

          <Link
            href="/daily"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Back to Reports
          </Link>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-6">Open Issues</h2>

      <div className="space-y-6">
        {openIssues.length === 0 && (
          <p className="text-gray-400">No open issues.</p>
        )}

      {sortedOpenIssues.map((issue: any) => {
          const task = (tasks || []).find(
            (t: Task) => normalizeId(t) === String(issue.taskId || "")
          );
const isTaskCompleted = task?.status === "Complete";
          const owner = (users || []).find(
            (u: User) => normalizeId(u) === String(issue.ownerId || "")
          );

          const isOverdue =
            new Date(issue.dueDate) < today && issue.status === "Open";

          return (
            <div
              key={issue.id || issue._id}
              onClick={() => setSelectedIssue(issue)}
              className={`bg-[#111827] border p-6 rounded-2xl shadow-lg cursor-pointer hover:border-red-500 transition ${
                isOverdue ? "border-red-600" : "border-gray-800"
              }`}
            >
              <div className="flex justify-between items-center gap-3">
                <h2 className="text-lg font-bold text-red-400">
                  {issue.title || "Operational Issue"}
                </h2>

                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${getPriorityClasses(
                      issue.priority || "Medium"
                    )}`}
                  >
                    {issue.priority || "Medium"}
                  </span>

                  {isOverdue && (
                    <span className="bg-red-600/20 text-red-400 px-3 py-1 text-xs rounded-full">
                      OVERDUE
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-2">
                Task: {task?.title || "-"}
              </p>
{isTaskCompleted && (
  <p className="text-xs text-yellow-400 mt-1 italic">
    This task has already been completed.
  </p>
)}
              <p className="text-sm text-gray-400">
                Owner: {owner?.fullName || "No superior assigned"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Category:{" "}
                {issue.category === "Other"
                  ? issue.customCategory || "Other"
                  : issue.category}
              </p>

              <p className="text-sm text-gray-500">
                Due: {new Date(issue.dueDate).toLocaleDateString()}
              </p>

              <p className="text-sm mt-3 text-gray-300 whitespace-pre-line">
                {issue.description}
              </p>

              <div className="mt-4">
                <span className="px-3 py-1 text-xs rounded-full bg-yellow-600/20 text-yellow-400">
                  {issue.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="text-xl font-bold mt-14 mb-6 text-gray-400">
        Issue History
      </h2>

      <div className="space-y-6">
        {resolvedIssues.length === 0 && (
          <p className="text-gray-500">No resolved issues yet.</p>
        )}

        {sortedResolvedIssues.map((issue: any) => {
          const task = (tasks || []).find(
            (t: Task) => normalizeId(t) === String(issue.taskId || "")
          );
const isTaskCompleted = task?.status === "Complete";
          return (
            <div
              key={issue.id || issue._id}
              onClick={() => setSelectedIssue(issue)}
              className="bg-[#0f172a] border border-gray-700 p-6 rounded-2xl opacity-70 cursor-pointer hover:border-gray-500 transition"
            >
              <h2 className="text-lg font-semibold text-gray-400">
                {issue.title}
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                Task: {task?.title || "-"}
              </p>
{isTaskCompleted && (
  <p className="text-xs text-yellow-400 mt-1 italic">
    This task has already been completed.
  </p>
)}
              <p className="text-sm text-gray-500 mt-2">
                Resolved on{" "}
                {issue.resolvedAt
                  ? new Date(issue.resolvedAt).toLocaleDateString()
                  : "-"}
              </p>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <div
          onClick={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111827] p-6 rounded-2xl w-[700px] max-w-[95vw] border border-gray-700"
          >
            <h2 className="text-xl font-bold text-red-400 mb-5">
              Report New Issue
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Project
                </label>
                <select
                  value={form.projectId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      projectId: e.target.value,
                      taskId: "",
                    }))
                  }
                  className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
                >
                  <option value="">Select project</option>
                  {myProjects.map((project: Project) => (
                    <option
                      key={normalizeId(project)}
                      value={normalizeId(project)}
                    >
                      {project.name || "Unnamed project"}
                    </option>
                  ))}
                </select>
              </div>

           <div>
  <label className="block text-sm text-gray-400 mb-2">
    Task
  </label>
  <select
    value={form.taskId}
    onChange={(e) =>
      setForm((prev) => ({
        ...prev,
        taskId: e.target.value,
      }))
    }
    className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
  >
    <option value="">Select task</option>
    {filteredTasksByProject.map((task: Task) => (
      <option key={normalizeId(task)} value={normalizeId(task)}>
        {task.title || "Untitled task"}
      </option>
    ))}
  </select>

  {selectedTask?.status === "Complete" && (
    <p className="mt-2 text-sm text-yellow-400">
      This task is already completed — it is a past task.
    </p>
  )}
</div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">
                  Issue Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
                  placeholder="e.g. Cement delivery delayed"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
                >
                  <option value="">Select category</option>
                  {ISSUE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {form.category === "Other" && (
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">
                    Custom Category
                  </label>
                  <input
                    type="text"
                    value={form.customCategory}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        customCategory: e.target.value,
                      }))
                    }
                    className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
                    placeholder="Enter custom category"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
                  placeholder="Describe the issue and its impact..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  min={todayInput}
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                  className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Superior
                </label>
                <input
                  type="text"
                  value={directSuperior?.fullName || "No superior assigned"}
                  disabled
                  className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2 text-gray-400"
                />
              </div>
            </div>

            {createError && (
              <p className="text-red-400 text-sm mt-4">{createError}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-600 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateIssue}
                disabled={loadingCreate}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {loadingCreate ? "Creating..." : "Create Issue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedIssue && (
        <div
          onClick={() => setSelectedIssue(null)}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111827] p-6 rounded-2xl w-[500px] border border-gray-700"
          >
            <h2 className="text-red-500 font-bold text-xl mb-4">
              {selectedIssue.status === "Resolved"
                ? "Issue Details"
                : "Resolve Issue"}
            </h2>

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">Task:</span>{" "}
                {
                  (tasks || []).find(
                    (t: Task) => normalizeId(t) === String(selectedIssue.taskId)
                  )?.title
                }
              </p>

              <p>
                <span className="text-gray-400">Owner:</span>{" "}
                {
                  (users || []).find(
                    (u: User) => normalizeId(u) === String(selectedIssue.ownerId)
                  )?.fullName
                }
              </p>

              <p>
                <span className="text-gray-400">Category:</span>{" "}
                {selectedIssue.category === "Other"
                  ? selectedIssue.customCategory || "Other"
                  : selectedIssue.category}
              </p>

              <p>
                <span className="text-gray-400">Priority:</span>{" "}
                {selectedIssue.priority || "Medium"}
              </p>

              <p>
                <span className="text-gray-400">Due Date:</span>{" "}
                {new Date(selectedIssue.dueDate).toLocaleDateString()}
              </p>

              <p className="whitespace-pre-line mt-3">
                {selectedIssue.description}
              </p>

              {selectedIssue.status === "Resolved" && selectedIssue.resolvedAt && (
                <p className="text-green-400 mt-3">
                  Resolved on{" "}
                  {new Date(selectedIssue.resolvedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 bg-gray-600 rounded-lg"
              >
                Close
              </button>

              {selectedIssue.status === "Open" && (
                <button
                  onClick={async () => {
                    updateIssue(selectedIssue.id || selectedIssue._id, {
                      status: "Resolved",
                      resolvedAt: new Date().toISOString(),
                    });

                    await fetch(`/api/issues/${selectedIssue.id || selectedIssue._id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        status: "Resolved",
                        resolvedAt: new Date().toISOString(),
                      }),
                    });

                    setSelectedIssue(null);
                  }}
                  className="px-4 py-2 bg-green-600 rounded-lg"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}