import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Issue } from "@/types/issue";

interface IssueStore {
  issues: Issue[];

  addIssue: (issue: Issue) => void;
  updateIssue: (id: string, patch: Partial<Issue>) => void;

  // 🔥 AJOUT POUR SYNC BACKEND
  setIssues: (issues: Issue[]) => void;
}

export const useIssueStore = create<IssueStore>()(
  persist(
    (set) => ({
      issues: [],

      // 🔥 NOUVEAU
      setIssues: (issues) =>
        set({
          issues,
        }),

      addIssue: (issue) =>
        set((state) => ({
          issues: [...state.issues, issue],
        })),

      updateIssue: (id, patch) =>
        set((state) => ({
          issues: state.issues.map((issue) =>
            issue.id === id
              ? { ...issue, ...patch }
              : issue
          ),
        })),
    }),
    {
      name: "issue-storage",
    }
  )
);
