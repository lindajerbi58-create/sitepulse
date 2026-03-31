"use client";

import { create } from "zustand";
import { DailyReport } from "@/types/dailyReport";

type DailyReportStore = {
  reports: DailyReport[];

  addReport: (report: DailyReport) => Promise<void>;
  getReportsByTask: (taskId: string) => DailyReport[];

  setReports: (reports: DailyReport[]) => void;
};

export const useDailyReportStore = create<DailyReportStore>()((set, get) => ({
  reports: [],

  setReports: (reports) => set({ reports }),

  addReport: async (report) => {
    try {
      const res = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (res.ok) {
        const newReport = await res.json();
        set((state) => ({ reports: [...state.reports, newReport] }));
      }
    } catch (error) {
      console.error("Failed to add report:", error);
    }
  },

  getReportsByTask: (taskId) => get().reports.filter((r) => r.taskId === taskId),
}));
