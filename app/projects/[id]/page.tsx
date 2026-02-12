"use client";

import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.id as string;

  const { projects, setCurrentProjectId } =
    useProjectStore();

  const { tasks } = useTaskStore();

  const project = projects.find(
    (p) => p.id === projectId
  );

  const projectTasks = tasks.filter(
    (t) => t.projectId === projectId
  );

  if (!project) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Project not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-2xl font-bold mb-6">
          {project.name}
        </h1>

        <button
          onClick={() => {
            setCurrentProjectId(projectId);
            router.push("/tasks/new");
          }}
          className="bg-blue-600 px-4 py-2 rounded mb-6"
        >
          + Add Task
        </button>

        {projectTasks.length === 0 && (
          <p className="text-gray-400">
            No tasks for this project yet.
          </p>
        )}

        <div className="space-y-4">
          {projectTasks.map((task) => (
            <div
              key={task.id}
              className="bg-[#111827] p-4 rounded-xl border border-gray-800"
            >
              <h2 className="font-semibold">
                {task.title}
              </h2>
              <p className="text-sm text-gray-400">
                Progress: {task.progress || 0}%
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
