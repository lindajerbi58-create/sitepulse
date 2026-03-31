import { create } from "zustand";
import { Issue } from "@/types/issue";

interface IssueStore {
  issues: Issue[];

  addIssue: (issue: Issue) => Promise<void>;
  updateIssue: (id: string, patch: Partial<Issue>) => Promise<void>;

  setIssues: (issues: Issue[]) => void;
}

export const useIssueStore = create<IssueStore>()((set) => ({
  issues: [],

  setIssues: (issues) => set({ issues }),

  addIssue: async (issue) => {
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issue),
      });
      if (res.ok) {
        const newIssue = await res.json();
        set((state) => ({ issues: [...state.issues, newIssue] }));
      }
    } catch (error) {
      console.error("Failed to add issue:", error);
    }
  },

  updateIssue: async (id, patch) => {
    // Optimistic update
    set((state) => ({
      issues: state.issues.map((issue) =>
        issue._id === id || issue.id === id ? { ...issue, ...patch } : issue
      ),
    }));
    try {
      const res = await fetch(`/api/issues/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        console.error("Failed to update issue on backend");
      }
    } catch (error) {
      console.error("Failed to update issue:", error);
    }
  },
}));
