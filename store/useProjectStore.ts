import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  status: "Active" | "Completed";
}

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  addProject: (project: Project) => void;
  setCurrentProjectId: (id: string) => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      currentProjectId: null,

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
        })),

      setCurrentProjectId: (id) =>
        set({ currentProjectId: id }),

      clearProject: () =>
        set({ currentProjectId: null }),
    }),
    {
      name: "project-storage",
    }
  )
);
