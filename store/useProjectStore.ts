import { create } from "zustand";

interface Project {
  _id?: string;
  id?: string;
  name: string;
  createdAt?: string;
  status?: "Active" | "Completed";
}

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => Promise<void>;
  setCurrentProjectId: (id: string) => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  projects: [],
  currentProjectId: null,

  setProjects: (projects) => set({ projects }),

  addProject: async (project) => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      if (res.ok) {
        const newProject = await res.json();
        set((state) => ({ projects: [...state.projects, newProject] }));
      }
    } catch (error) {
      console.error("Failed to add project:", error);
    }
  },

  setCurrentProjectId: (id) => {
    localStorage.setItem("sitepulse-current-project", id);
    set({ currentProjectId: id });
  },

  clearProject: () => {
    localStorage.removeItem("sitepulse-current-project");
    set({ currentProjectId: null });
  },
}));
