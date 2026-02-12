"use client";

import { useState, useEffect } from "react";
import { useIssueStore } from "@/store/useIssueStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useUserStore } from "@/store/useUserStore";
import Link from "next/link";

export default function IssuesPage() {
  const { issues, updateIssue, addIssue } = useIssueStore();
  const { tasks } = useTaskStore();
  const { users } = useUserStore();

  const today = new Date();

  const [selectedIssue, setSelectedIssue] =
    useState<any>(null);

  // 🔥 FETCH BACKEND ISSUES
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await fetch("/api/issues");
        const data = await res.json();

        data.forEach((issue: any) => {
          addIssue({
            ...issue,
            id: issue._id, // 🔥 Mongo compatibility
          });
        });
      } catch (err) {
        console.error("Issue fetch failed", err);
      }
    };

    fetchIssues();
  }, []);

  const openIssues = issues.filter(
    (i) => i.status === "Open"
  );

  const resolvedIssues = issues.filter(
    (i) => i.status === "Resolved"
  );

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Issues</h1>

        <Link
          href="/daily"
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
        >
          Back to Reports
        </Link>
      </div>

      {/* 🔴 OPEN ISSUES */}
      <h2 className="text-xl font-bold mb-6">
        Open Issues
      </h2>

      <div className="space-y-6">
        {openIssues.length === 0 && (
          <p className="text-gray-400">
            No open issues.
          </p>
        )}

        {openIssues.map((issue) => {
          const task = tasks.find(
            (t) => t.id === issue.taskId
          );

          const owner = users.find(
            (u) => u._id === issue.ownerId
          );

          const isOverdue =
            new Date(issue.dueDate) < today &&
            issue.status === "Open";

          return (
            <div
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              className={`bg-[#111827] border p-6 rounded-2xl shadow-lg cursor-pointer hover:border-red-500 transition ${
                isOverdue
                  ? "border-red-600"
                  : "border-gray-800"
              }`}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-red-400">
                  ⚠ Operational Issue
                </h2>

                {isOverdue && (
                  <span className="bg-red-600/20 text-red-400 px-3 py-1 text-xs rounded-full">
                    OVERDUE
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-400 mt-2">
                Task: {task?.title}
              </p>

              <p className="text-sm text-gray-400">
                Owner: {owner?.fullName}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Category: {issue.category}
              </p>

              <p className="text-sm text-gray-500">
                Due:{" "}
                {new Date(
                  issue.dueDate
                ).toLocaleDateString()}
              </p>

              <p className="text-sm mt-3 text-gray-300 whitespace-pre-line">
                {issue.description}
              </p>

              <div className="mt-4">
                <span className="px-3 py-1 text-xs rounded-full bg-yellow-600/20 text-yellow-400">
                  {issue.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🟢 ISSUE HISTORY */}
      <h2 className="text-xl font-bold mt-14 mb-6 text-gray-400">
        Issue History
      </h2>

      <div className="space-y-6">
        {resolvedIssues.length === 0 && (
          <p className="text-gray-500">
            No resolved issues yet.
          </p>
        )}

        {resolvedIssues.map((issue) => {
          const task = tasks.find(
            (t) => t.id === issue.taskId
          );

          return (
            <div
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              className="bg-[#0f172a] border border-gray-700 p-6 rounded-2xl opacity-70 cursor-pointer hover:border-gray-500 transition"
            >
              <h2 className="text-lg font-semibold text-gray-400">
                {issue.title}
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                Task: {task?.title}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Resolved on{" "}
                {issue.resolvedAt
                  ? new Date(
                      issue.resolvedAt
                    ).toLocaleDateString()
                  : "-"}
              </p>
            </div>
          );
        })}
      </div>

      {/* 🔥 POPUP */}
      {selectedIssue && (
        <div
          onClick={() => setSelectedIssue(null)}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111827] p-6 rounded-2xl w-[500px] border border-gray-700"
          >
            <h2 className="text-red-500 font-bold text-xl mb-4">
              {selectedIssue.status === "Resolved"
                ? "Issue Details"
                : "Resolve Issue"}
            </h2>

            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">
                  Task:
                </span>{" "}
                {
                  tasks.find(
                    (t) =>
                      t.id ===
                      selectedIssue.taskId
                  )?.title
                }
              </p>

              <p>
                <span className="text-gray-400">
                  Owner:
                </span>{" "}
                {
                  users.find(
                    (u) =>
                      u._id ===
                      selectedIssue.ownerId
                  )?.fullName
                }
              </p>

              <p>
                <span className="text-gray-400">
                  Category:
                </span>{" "}
                {selectedIssue.category}
              </p>

              <p>
                <span className="text-gray-400">
                  Due Date:
                </span>{" "}
                {new Date(
                  selectedIssue.dueDate
                ).toLocaleDateString()}
              </p>

              <p className="whitespace-pre-line mt-3">
                {selectedIssue.description}
              </p>

              {selectedIssue.status ===
                "Resolved" &&
                selectedIssue.resolvedAt && (
                  <p className="text-green-400 mt-3">
                    Resolved on{" "}
                    {new Date(
                      selectedIssue.resolvedAt
                    ).toLocaleDateString()}
                  </p>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() =>
                  setSelectedIssue(null)
                }
                className="px-4 py-2 bg-gray-600 rounded-lg"
              >
                Close
              </button>

              {selectedIssue.status ===
                "Open" && (
                <button
                  onClick={async () => {
                    updateIssue(
                      selectedIssue.id,
                      {
                        status: "Resolved",
                        resolvedAt:
                          new Date().toISOString(),
                      }
                    );

                    // 🔥 Backend sync
                    await fetch(
                      `/api/issues/${selectedIssue.id}`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type":
                            "application/json",
                        },
                        body: JSON.stringify({
                          status: "Resolved",
                          resolvedAt:
                            new Date().toISOString(),
                        }),
                      }
                    );

                    setSelectedIssue(null);
                  }}
                  className="px-4 py-2 bg-green-600 rounded-lg"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
