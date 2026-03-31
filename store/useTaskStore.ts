"use client";

import { create } from "zustand";
import { Task } from "../types/task";

type TaskStore = {
  tasks: Task[];

  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  addSubtask: (parentId: string, task: Task) => Promise<void>;

  setTasks: (tasks: Task[]) => void;

  getTaskById: (id: string) => Task | undefined;
  myTasks: (userId: string) => Task[];
  assignedByMe: (userId: string) => Task[];
};

export const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],

  setTasks: (tasks) => set({ tasks }),

  addTask: async (task) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (res.ok) {
        const newTask = await res.json();
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  },

  updateTask: async (id, patch) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === id || t.id === id ? { ...t, ...patch } : t)),
    }));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        console.error("Failed to update task on backend");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  },

  addSubtask: async (parentId, task) => {
    try {
      const subtask = { ...task, parentId };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subtask),
      });
      if (res.ok) {
        const newTask = await res.json();
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      }
    } catch (error) {
      console.error("Failed to add subtask:", error);
    }
  },

  getTaskById: (id) => {
    return get().tasks.find((t) => t._id === id || t.id === id);
  },

  myTasks: (userId) => {
    return get().tasks.filter((t) => t.assigneeId === userId);
  },

  assignedByMe: (userId) => {
    return get().tasks.filter((t) => t.createdById === userId);
  },
}));
