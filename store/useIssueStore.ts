import { create } from "zustand";

type Issue = any;

type IssueStore = {
  issues: Issue[];
  setIssues: (issues: Issue[]) => void;
  addIssue: (issue: Issue) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
};

const normalizeId = (value: any) => String(value?._id || value?.id || value || "");

export const useIssueStore = create<IssueStore>((set) => ({
  issues: [],

  setIssues: (issues) => {
    const map = new Map<string, Issue>();

    for (const issue of issues || []) {
      const id = normalizeId(issue);
      if (!id) continue;
      map.set(id, { ...issue, id });
    }

    set({ issues: Array.from(map.values()) });
  },

  addIssue: (issue) =>
    set((state) => {
      const id = normalizeId(issue);
      const exists = state.issues.some((i) => normalizeId(i) === id);

      if (exists) return state;

      return {
        issues: [...state.issues, { ...issue, id }],
      };
    }),

  updateIssue: (id, updates) =>
    set((state) => ({
      issues: state.issues.map((issue) =>
        normalizeId(issue) === String(id)
          ? { ...issue, ...updates }
          : issue
      ),
    })),
}));