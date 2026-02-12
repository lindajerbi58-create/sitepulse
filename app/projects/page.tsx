"use client";

import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { v4 as uuidv4 } from "uuid";
import { useState } from "react";

export default function ProjectsPage() {
  const router = useRouter();

  const {
    projects,
    currentProjectId,
    addProject,
    setCurrentProjectId,
  } = useProjectStore();

  const [name, setName] = useState("");

  // 🔥 CREATE PROJECT
  const handleCreate = () => {
    if (!name) return;

    const newProject = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      status: "Active" as const,
    };

    addProject(newProject);
    setCurrentProjectId(newProject.id);

    setName("");

    // 🔥 Optionnel : rediriger directement vers tasks
    router.push("/tasks");
  };

  // 🔥 SET ACTIVE PROJECT
  const handleSetActive = (projectId: string) => {
    setCurrentProjectId(projectId);
    router.push("/tasks");
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-2xl font-bold mb-6">Projects</h1>

        {/* Create */}
        <div className="flex gap-4 mb-8">
          <input
            placeholder="Project name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-[#1f2937] p-3 rounded-lg"
          />
          <button
            onClick={handleCreate}
            className="bg-blue-600 px-4 rounded-lg"
          >
            Create
          </button>
        </div>

        {/* List */}
        <div className="space-y-4">
          {projects.length === 0 && (
            <p className="text-gray-400">
              No projects created yet.
            </p>
          )}

          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-[#111827] p-4 rounded-xl border border-gray-800 flex justify-between items-center"
            >
              <div>
                <h2 className="font-semibold">
                  {project.name}
                </h2>
                <p className="text-sm text-gray-400">
                  {project.status}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleSetActive(project.id)}
                  className="px-4 py-2 bg-blue-600 rounded-lg"
                >
                  Set Active
                </button>

                <button
                  onClick={() => {
                    setCurrentProjectId(project.id);
                    router.push(`/projects/${project.id}`);
                  }}
                  className="bg-indigo-600 px-3 py-1 rounded-md text-sm"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
