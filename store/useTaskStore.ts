"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Task } from "../types/task";

type TaskStore = {
  tasks: Task[];

  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  addSubtask: (parentId: string, task: Task) => void;

  // 🔥 AJOUT
  setTasks: (tasks: Task[]) => void;

  getTaskById: (id: string) => Task | undefined;
  myTasks: (userId: string) => Task[];
  assignedByMe: (userId: string) => Task[];
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],

      // 🔥 AJOUT POUR SYNC BACKEND
      setTasks: (tasks) =>
        set({
          tasks,
        }),

      addTask: (task) =>
        set((state) => ({
          tasks: [...state.tasks, task],
        })),

      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        })),

      addSubtask: (parentId, task) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...task,
              parentId,
            },
          ],
        })),

      getTaskById: (id) => {
        return get().tasks.find((t) => t.id === id);
      },

      myTasks: (userId) => {
        return get().tasks.filter((t) => t.assigneeId === userId);
      },

      assignedByMe: (userId) => {
        return get().tasks.filter((t) => t.createdById === userId);
      },
    }),
    {
      name: "sitepulse-tasks",
    }
  )
);
