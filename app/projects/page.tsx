"use client";

import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { useUserStore } from "@/store/useUserStore";
import { useEffect, useMemo, useState } from "react";

type Project = {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  status?: "Planning" | "Active" | "On Hold" | "Completed" | string;
  createdById?: string;
  managerId?: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function ProjectsPage() {
  const router = useRouter();

  const { currentProjectId, setCurrentProjectId } = useProjectStore() as any;
  const currentUser = useUserStore((state: any) => state.currentUser);

  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const normalizeId = (value: any) =>
    String(value?._id || value?.id || value || "");

  const loadProjects = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const res = await fetch("/api/projects", { cache: "no-store" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load projects (${res.status}): ${text}`);
      }

      const data = await res.json();
      const safeProjects = Array.isArray(data) ? data : [];

      setProjects(safeProjects);

      // si aucun projet actif n'est défini, prendre le premier automatiquement
      if (!currentProjectId && safeProjects.length > 0) {
        setCurrentProjectId(normalizeId(safeProjects[0]));
      }
    } catch (err: any) {
      console.error("loadProjects error:", err);
      setError(err?.message || "Unable to load projects.");
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    loadProjects();
  }, [mounted]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [projects]);

  const handleCreate = async () => {
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    try {
      setCreating(true);

      const payload = {
        name: trimmedName,
        description: trimmedDescription,
        status: "Active",
        createdById: String(currentUser?._id || currentUser?.id || ""),
        managerId: String(currentUser?._id || currentUser?.id || ""),
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create project (${res.status}): ${text}`);
      }

      const newProject = await res.json();
      const newProjectId = normalizeId(newProject);

      setProjects((prev) => [newProject, ...prev]);
      setCurrentProjectId(newProjectId);

      setName("");
      setDescription("");
      setSuccess("Project created successfully.");

      router.push("/tasks");
    } catch (err: any) {
      console.error("handleCreate error:", err);
      setError(err?.message || "Failed to create project.");
    } finally {
      setCreating(false);
    }
  };

  const handleSetActive = (projectId: string) => {
    setCurrentProjectId(projectId);
    setSuccess("Active project updated.");
    router.push("/tasks");
  };

  const activeProject = useMemo(() => {
    return projects.find(
      (project) => normalizeId(project) === String(currentProjectId || "")
    );
  }, [projects, currentProjectId]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Loading projects...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <button
  onClick={() => router.push("/dashboard")}
  className="mb-6 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition"
>
  ← Back to Dashboard
</button>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-sm text-gray-400 mt-2">
              Create, select, and manage your active project workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => loadProjects(true)}
              disabled={refreshing}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={() => router.push("/tasks")}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg"
            >
              Go to Tasks
            </button>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 mb-8">
          <div className="text-sm text-gray-400">
            Current Active Project:
            <span className="ml-2 text-blue-400 font-semibold">
              {activeProject?.name || "None"}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {success}
          </div>
        )}

        {/* Create */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-10">
          <h2 className="text-xl font-semibold mb-4">Create Project</h2>

          <div className="grid md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">
                Project Name
              </label>
              <input
                placeholder="Project name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={creating}
                className="w-full bg-[#1f2937] border border-gray-700 p-3 rounded-lg outline-none focus:border-blue-500 disabled:opacity-60"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">
                Description
              </label>
              <input
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={creating}
                className="w-full bg-[#1f2937] border border-gray-700 p-3 rounded-lg outline-none focus:border-blue-500 disabled:opacity-60"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <MiniKpi title="Total Projects" value={projects.length} />
          <MiniKpi
            title="Active"
            value={projects.filter((p) => String(p.status) === "Active").length}
          />
          <MiniKpi
            title="Completed"
            value={projects.filter((p) => String(p.status) === "Completed").length}
          />
          <MiniKpi
            title="Current"
            value={activeProject ? 1 : 0}
            accent="text-blue-400"
          />
        </div>

        {/* List */}
        <div className="space-y-4">
          {sortedProjects.length === 0 && (
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-10 text-center text-gray-400">
              No projects created yet.
            </div>
          )}

          {sortedProjects.map((project) => {
            const projectId = normalizeId(project);
            const isActive = String(currentProjectId || "") === projectId;

            return (
              <div
                key={projectId}
                className={`bg-[#111827] p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                  isActive
                    ? "border-blue-500 shadow-lg shadow-blue-500/10"
                    : "border-gray-800"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold text-lg">
                      {project.name || "Unnamed Project"}
                    </h2>

                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        isActive
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {isActive ? "Active Workspace" : "Available"}
                    </span>

                    <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300">
                      {project.status || "Active"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-400 mt-2">
                    {project.description || "No description provided."}
                  </p>

                  <div className="text-xs text-gray-500 mt-2">
                    Created:{" "}
                    {project.createdAt
                      ? new Date(project.createdAt).toLocaleString()
                      : "N/A"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleSetActive(projectId)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Set Active
                  </button>

                  <button
                    onClick={() => {
                      setCurrentProjectId(projectId);
                      router.push("/tasks");
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                  >
                    Open Tasks
                  </button>

                  <button
                    onClick={() => {
                      setCurrentProjectId(projectId);
                      router.push(`/projects/${projectId}`);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm"
                  >
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniKpi({
  title,
  value,
  accent = "text-white",
}: {
  title: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
      <div className="text-xs text-gray-400">{title}</div>
      <div className={`text-2xl font-bold mt-2 ${accent}`}>{value}</div>
    </div>
  );
}