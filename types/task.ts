// types/task.ts

/* ===== ENUM LIKE CONSTANTS ===== */

export const TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "On Hold",
  "Complete",
] as const;

export const TASK_PRIORITIES = [
  "Low",
  "Medium",
  "High",
] as const;

/* ===== TYPES ===== */

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/* ===== MAIN TASK TYPE ===== */
export interface Subtask {
  id: string;
  projectId: string;
  parentId: string;
  title: string;
  description?: string;
  assigneeId: string;
  createdById: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
}

export type Task = {
  id: string;
  title: string;
  description?: string;

  assigneeId: string;
  createdById: string;

  dueDate: string; // ISO string
  priority: TaskPriority;
  status: TaskStatus;

  totalTarget?: number;
  progress?: number;

  parentId?: string;
  createdAt: string;

  projectId: string;
   subtasks?: Subtask[];
};
