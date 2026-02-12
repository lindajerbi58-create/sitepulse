"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useTaskStore } from "@/store/useTaskStore";
import { useUserStore } from "@/store/useUserStore";
import { useProjectStore } from "@/store/useProjectStore";
import { canAssign } from "@/lib/hierarchy";
import { TaskPriority, TaskStatus } from "@/types/task";

export default function NewTaskPage() {
  const router = useRouter();
  const { addTask } = useTaskStore();

  const users = useUserStore((state) => state.users);
  const currentUser = useUserStore((state) => state.currentUser);
  const currentUserId = currentUser?._id;

  const { currentProjectId } = useProjectStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId || "");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [totalTarget, setTotalTarget] = useState(0);

  // 🔥 Allowed users fix (handles ObjectId or string)
  const allowedUsers = users.filter((u) => {
    if (!u.reportsTo || !currentUserId) return false;

    const reportsToId =
      typeof u.reportsTo === "object"
        ? u.reportsTo._id
        : u.reportsTo;

    return String(reportsToId) === String(currentUserId);
  });

  const handleSubmit = async () => {
    if (!currentProjectId) {
      alert("No active project selected.");
      return;
    }

    if (!title || !dueDate) {
      alert("Title and Due Date required");
      return;
    }

    if (!currentUserId) {
      alert("User not authenticated");
      return;
    }

    const newTask = {
      id: uuidv4(),
      projectId: currentProjectId,
      title,
      description,
      assigneeId: assigneeId || currentUserId,
      createdById: currentUserId,
      dueDate: new Date(dueDate).toISOString(),
      priority: priority as TaskPriority,
      status: "Not Started" as TaskStatus,
      createdAt: new Date().toISOString(),
      totalTarget,
      progress: 0,
    };

    // 🔥 1️⃣ Save local (Zustand)
    addTask(newTask);

    // 🔥 2️⃣ Save backend
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTask),
      });
    } catch (error) {
      console.error("Backend task creation failed", error);
    }

    router.push("/tasks");
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-[#111827] border border-gray-800 rounded-2xl shadow-2xl p-8">

        <h1 className="text-2xl font-bold mb-6">Create New Task</h1>

        <div className="mb-5">
          <label className="text-gray-400 text-sm">Task Title</label>
          <input
            className="w-full mt-2 bg-[#1f2937] border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Install piping section A"
          />
        </div>

        <div className="mb-5">
          <label className="text-gray-400 text-sm">Description</label>
          <textarea
            className="w-full mt-2 bg-[#1f2937] border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional task details..."
          />
        </div>

        <div className="mb-5">
          <label className="text-gray-400 text-sm">Assign To</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full mt-2 bg-[#1f2937] border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Assign to myself</option>
            {allowedUsers.map((u) => (
              <option key={u._id} value={u._id}>
                {u.fullName} — {u.role}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="text-gray-400 text-sm">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full mt-2 bg-[#1f2937] border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="mb-8">
          <label className="text-gray-400 text-sm">Priority</label>
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as TaskPriority)
            }
            className="w-full mt-2 bg-[#1f2937] border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <input
          type="number"
          placeholder="Total Target Quantity"
          className="w-full bg-[#1f2937] p-3 rounded-lg mb-8"
          value={totalTarget}
          onChange={(e) =>
            setTotalTarget(Number(e.target.value))
          }
        />

        <div className="flex justify-between">
          <button
            onClick={() => router.push("/tasks")}
            className="px-6 py-3 border border-gray-700 rounded-lg hover:bg-[#1f2937] transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
