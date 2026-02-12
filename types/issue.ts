export type IssueStatus =
  | "Open"
  | "In Progress"
  | "Blocked"
  | "Resolved"
  | "Closed";


export type IssueCategory =
  | "Performance"
  | "Quality"
  | "Procurement"
  | "Logistics"
  | "Safety"
  | "Other";

export interface Issue {
  id: string;
  taskId: string;
  reportId?: string;

  title: string;
  description?: string;

  category: IssueCategory;
  ownerId: string;
projectId: string;

  dueDate: string;
  status: IssueStatus;
resolvedAt?: string; // 🔥 AJOUT ICI
  createdAt: string;
}
