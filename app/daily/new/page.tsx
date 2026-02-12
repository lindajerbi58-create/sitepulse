"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useTaskStore } from "@/store/useTaskStore";
import { useUserStore } from "@/store/useUserStore";
import { useDailyReportStore } from "@/store/useDailyReportStore";
import { DelayReason } from "@/types/dailyReport";
import { useIssueStore } from "@/store/useIssueStore";
import { useProjectStore } from "@/store/useProjectStore";

export default function NewDailyReportPage() {
  const router = useRouter();
  const reportId = uuidv4();

  const { tasks } = useTaskStore();
  const currentUser = useUserStore((state) => state.currentUser);
  const currentUserId = currentUser?._id;

  const { addReport } = useDailyReportStore();
  const { addIssue } = useIssueStore();
  const { currentProjectId } = useProjectStore();

  // 🔥 Protection projet actif
  if (!currentProjectId) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        <div className="bg-[#111827] p-6 rounded-xl border border-gray-800">
          <p>No active project selected.</p>
        </div>
      </div>
    );
  }

  // 🔥 Filtrer tâches par projet actif (SAFE)
  const projectTasks = tasks.filter(
    (t) => t.projectId === currentProjectId
  );

  const [taskId, setTaskId] = useState("");
  const [isQuantitative, setIsQuantitative] = useState(true);
  const [target, setTarget] = useState(0);
  const [actual, setActual] = useState(0);
  const [delayReasons, setDelayReasons] = useState<DelayReason[]>([]);
  const [qualityLevel, setQualityLevel] = useState<
    "Very Good" | "Medium" | "Low"
  >("Very Good");
  const [comment, setComment] = useState("");

  const handleSubmit = async () => {
    if (!currentUserId) {
      alert("User not authenticated");
      return;
    }

    if (!taskId) {
      alert("Select a task");
      return;
    }

    const todayString = new Date().toDateString();

    const existingReport = useDailyReportStore
      .getState()
      .reports.find(
        (r) =>
          r.taskId === taskId &&
          r.userId === currentUserId &&
          r.projectId === currentProjectId &&
          new Date(r.date).toDateString() === todayString
      );

    if (existingReport) {
      alert("You already submitted a report for this task today.");
      return;
    }

    const selectedTask = projectTasks.find(
      (t) => t.id === taskId
    );

    if (
      isQuantitative &&
      selectedTask &&
      selectedTask.totalTarget &&
      target > selectedTask.totalTarget
    ) {
      alert(
        `Daily target cannot exceed final target (${selectedTask.totalTarget})`
      );
      return;
    }

    // 🔥 BACKEND SAVE
    try {
      await fetch("/api/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          projectId: currentProjectId, // ✅ safe
          date: new Date().toISOString(),
          workDone: isQuantitative
            ? `Target: ${target}, Actual: ${actual}`
            : comment,
          issues: delayReasons.join(", "),
          plansTomorrow: "",
        }),
      });
    } catch (err) {
      console.error("Backend save failed", err);
    }

    // 🔥 1️⃣ Ajouter report local
    addReport({
      id: reportId,
      taskId,
      projectId: currentProjectId, // ✅ plus d'erreur TS
      userId: currentUserId,
      date: new Date().toISOString(),
      targetQuantity: isQuantitative ? target : 0,
      actualQuantity: isQuantitative ? actual : 0,
      delayReasons: isQuantitative ? delayReasons : [],
      comment: isQuantitative ? undefined : comment,
      qualityLevel: isQuantitative ? undefined : qualityLevel,
      createdAt: new Date().toISOString(),
    });

    // 🔥 2️⃣ Update progression
    const task = projectTasks.find((t) => t.id === taskId);

    if (task && task.totalTarget && isQuantitative) {
      const relatedReports =
        useDailyReportStore
          .getState()
          .reports
          .filter(
            (r) =>
              r.taskId === taskId &&
              r.projectId === currentProjectId
          );

      const totalActual = relatedReports.reduce(
        (sum, r) => sum + (r.actualQuantity || 0),
        0
      );

      const progress =
        (totalActual / task.totalTarget) * 100;

      useTaskStore.getState().updateTask(taskId, {
        progress: Math.min(progress, 100),
        status:
          progress >= 100
            ? "Complete"
            : "In Progress",
      });
    }

    // 🔥 3️⃣ Auto issue
    if (isQuantitative && target > 0) {
      const performance = (actual / target) * 100;

      if (actual < target || performance < 70) {
        const delayText =
          delayReasons.length > 0
            ? `Delays detected: ${delayReasons.join(", ")}`
            : "Underperformance detected.";

        addIssue({
          id: uuidv4(),
          taskId,
          projectId: currentProjectId, // ✅ safe
          reportId,
          title: "Operational Delay Detected",
          description: `
Performance dropped to ${performance.toFixed(1)}%.
${delayText}
          `,
          category: "Performance",
          ownerId: currentUserId,
          dueDate: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000
          ).toISOString(),
          status: "Open",
          createdAt: new Date().toISOString(),
        });
      }
    }

    router.push("/tasks");
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="max-w-xl mx-auto bg-[#111827] p-6 rounded-2xl border border-gray-800">
        <h1 className="text-xl font-bold mb-6">
          New Daily Report
        </h1>

        <div className="space-y-4">

          <select
            className="w-full bg-[#1f2937] p-3 rounded-lg"
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">Select Task</option>
            {projectTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

          <div className="bg-[#1f2937] p-4 rounded-lg">
            <p className="mb-3 text-sm text-gray-300">
              Is this a quantity-based task?
            </p>

            <div className="flex gap-6">
              <label>
                <input
                  type="radio"
                  checked={isQuantitative}
                  onChange={() => setIsQuantitative(true)}
                  className="mr-2"
                />
                Yes (Quantitative)
              </label>

              <label>
                <input
                  type="radio"
                  checked={!isQuantitative}
                  onChange={() => setIsQuantitative(false)}
                  className="mr-2"
                />
                No (Qualitative)
              </label>
            </div>
          </div>

          {isQuantitative && (
            <>
              <input
                type="number"
                placeholder="Target Quantity"
                className="w-full bg-[#1f2937] p-3 rounded-lg"
                onChange={(e) =>
                  setTarget(Number(e.target.value))
                }
              />

              <input
                type="number"
                placeholder="Actual Quantity"
                className="w-full bg-[#1f2937] p-3 rounded-lg"
                onChange={(e) =>
                  setActual(Number(e.target.value))
                }
              />
            </>
          )}

          {!isQuantitative && (
            <>
              <textarea
                placeholder="Write a short comment..."
                className="w-full bg-[#1f2937] p-3 rounded-lg"
                value={comment}
                onChange={(e) =>
                  setComment(e.target.value)
                }
              />

              <div className="flex gap-6">
                {["Very Good", "Medium", "Low"].map(
                  (level) => (
                    <label key={level}>
                      <input
                        type="radio"
                        checked={
                          qualityLevel === level
                        }
                        onChange={() =>
                          setQualityLevel(
                            level as any
                          )
                        }
                        className="mr-2"
                      />
                      {level}
                    </label>
                  )
                )}
              </div>
            </>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
