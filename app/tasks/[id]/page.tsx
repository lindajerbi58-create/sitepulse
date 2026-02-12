"use client";

import { useState, useEffect } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { useUserStore } from "@/store/useUserStore";
import Link from "next/link";
import { useDailyReportStore } from "@/store/useDailyReportStore";
import { useProcurementStore } from "@/store/useProcurementStore";
import { predictDelay } from "@/lib/delayPredictor";
import { useProjectStore } from "@/store/useProjectStore";
import { useRouter } from "next/navigation";

export default function TasksPage() {
  const router = useRouter();

  const { tasks } = useTaskStore();
  const { users } = useUserStore();
  const { reports } = useDailyReportStore();
  const { items: procurementItems } = useProcurementStore();
  const { currentProjectId, projects } = useProjectStore();
  const currentUser = useUserStore((state) => state.currentUser);

  const [viewMode, setViewMode] =
    useState<"my" | "assigned" | "all">("all");

  useEffect(() => {
    if (!currentProjectId) {
      router.push("/projects");
    }
  }, [currentProjectId, router]);

  if (!currentProjectId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Redirecting to Projects...
      </div>
    );
  }

  const activeProject = projects.find((p: any) => p.id === currentProjectId);

  const sortByDate = (a: any, b: any) =>
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();

  const projectTasks = tasks.filter(
    (task: any) => String(task.projectId) === String(currentProjectId)
  );

  /* 🔥 FILTER LOGIC */
  const filteredTasks = projectTasks.filter((task: any) => {
    if (!currentUser) return false;

    if (viewMode === "all") {
      return (
        String(task.assigneeId) === String(currentUser._id) ||
        String(task.createdById) === String(currentUser._id)
      );
    }

    if (viewMode === "my") {
      return String(task.assigneeId) === String(currentUser._id);
    }

    if (viewMode === "assigned") {
      return String(task.createdById) === String(currentUser._id);
    }

    return false;
  });

  /* 🔥 ACTIVE & HISTORY */
  const activeTasks = filteredTasks.filter((task: any) => {
    const parentKey = task.id || task._id;

    const subtasks = tasks.filter(
      (t: any) =>
        String(t.parentId) === String(parentKey) &&
        String(t.projectId) === String(currentProjectId)
    );

    const total = subtasks.length;
    const completed = subtasks.filter((st: any) => st.status === "Complete").length;

    const progress = total > 0 ? (completed / total) * 100 : 0;

    return task.status !== "Complete" && progress < 100;
  });

  const historyTasks = filteredTasks.filter((task: any) => {
    const parentKey = task.id || task._id;

    const subtasks = tasks.filter(
      (t: any) =>
        String(t.parentId) === String(parentKey) &&
        String(t.projectId) === String(currentProjectId)
    );

    const total = subtasks.length;
    const completed = subtasks.filter((st: any) => st.status === "Complete").length;

    const progress = total > 0 ? (completed / total) * 100 : 0;

    return task.status === "Complete" || progress === 100;
  });

  /* 🔥 PRIORITY GROUPS — FIXED */
  const high = activeTasks.filter((t: any) => t.priority === "High").sort(sortByDate);
  const medium = activeTasks.filter((t: any) => t.priority === "Medium").sort(sortByDate);
  const low = activeTasks.filter((t: any) => t.priority === "Low").sort(sortByDate);

  const renderGroup = (title: string, color: string, list: any[]) => {
    if (list.length === 0) return null;

    return (
      <div className="mb-12">
        <h2 className={`text-xl font-bold mb-4 ${color}`}>{title}</h2>

        <div className="space-y-4">
          {list.map((task: any, index: number) => {
            const taskId = task.id || task._id;

            const blocked = procurementItems.some(
              (p: any) =>
                String(p.relatedTaskId) === String(taskId) &&
                p.status !== "Delivered"
            );

            const delayRisk = predictDelay(task, reports);

            const assignee = users.find((u: any) => String(u._id) === String(task.assigneeId));

            /* 🔥 SUBTASK PROGRESS */
            const subtasks = tasks.filter(
              (t: any) =>
                String(t.parentId) === String(taskId) &&
                String(t.projectId) === String(currentProjectId)
            );

            const totalSubtasks = subtasks.length;

            const completedSubtasks = subtasks.filter(
              (st: any) => st.status === "Complete"
            ).length;

            const progress =
              totalSubtasks > 0
                ? Math.round((completedSubtasks / totalSubtasks) * 100)
                : 0;

            return (
              <div
                key={(taskId || `${task.title}-${task.dueDate}-${index}`) as string}
                onClick={() => {
                  if (!taskId) return;
                  if (task.status !== "Complete") {
                    router.push(`/tasks/${taskId}`);
                  }
                }}
                className={`bg-[#111827] border p-5 rounded-2xl shadow-lg transition-all duration-200
                  ${
                    task.status === "Complete"
                      ? "border-gray-700 opacity-50 grayscale cursor-not-allowed"
                      : "border-gray-800 cursor-pointer hover:border-blue-500 hover:scale-[1.01]"
                  }`}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{task.title}</h3>

                  {blocked && (
                    <span className="text-red-500 text-xs">
                      🚫 Waiting for Materials
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-400 mt-2">
                  Assigned: {assignee?.fullName}
                </div>

                <div className="text-sm text-gray-500 mt-2">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </div>

                {totalSubtasks > 0 ? (
                  <div className="mt-6 flex flex-col items-center">
                    <div className="flex justify-between w-2/3 text-xs mb-2">
                      <span className="text-gray-400">Progress</span>
                      <span className="font-bold text-blue-400">{progress}%</span>
                    </div>

                    <div className="w-2/3 bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-green-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="text-sm mt-2 text-gray-400">
                      {completedSubtasks} / {totalSubtasks} completed
                    </div>

                    <div className="text-sm mt-2">🔮 Delay Risk: {delayRisk}</div>
                  </div>
                ) : (
                  <div className="mt-6 text-center">
                    <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-600/20 text-blue-400">
                      Qualitative Task
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Control Center</h1>

        <div className="flex gap-4">
          <button
            onClick={() => setViewMode("all")}
            className="bg-gray-600 px-4 py-2 rounded-lg"
          >
            All
          </button>

          <button
            onClick={() => setViewMode("my")}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            My Tasks
          </button>

          <button
            onClick={() => setViewMode("assigned")}
            className="bg-purple-600 px-4 py-2 rounded-lg"
          >
            Assigned by Me
          </button>

          <Link
            href="/tasks/new"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg shadow-lg"
          >
            + New Task
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between bg-[#111827] border border-gray-800 px-4 py-3 rounded-xl mb-10">
        <div className="text-sm text-gray-400">
          Active Project:
          <span className="ml-2 text-blue-400 font-semibold">
            {activeProject?.name || "None"}
          </span>
        </div>

        <Link
          href="/projects"
          className="text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md"
        >
          Switch Project
        </Link>
      </div>

      {renderGroup("HIGH PRIORITY", "text-red-400", high)}
      {renderGroup("MEDIUM PRIORITY", "text-green-400", medium)}
      {renderGroup("LOW PRIORITY", "text-yellow-400", low)}

      {/* 🔥 HISTORY */}
      {historyTasks.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-gray-500 mb-6">History</h2>

          <div className="space-y-4">
            {historyTasks.map((task: any, index: number) => {
              const taskId = task.id || task._id;
              return (
                <div
                  key={(taskId || `${task.title}-${task.dueDate}-${index}`) as string}
                  className="bg-[#1a1f2e] border border-gray-700 p-5 rounded-2xl opacity-60 grayscale cursor-not-allowed"
                >
                  <h3 className="text-lg font-semibold text-gray-400">
                    {task.title}
                  </h3>

                  <p className="text-sm text-gray-500 mt-2">Completed</p>
                </div>
              );
            })}
          </div>
        </div>
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