"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DailyReport } from "@/types/dailyReport";

type DailyReportStore = {
  reports: DailyReport[];

  addReport: (report: DailyReport) => void;
  getReportsByTask: (taskId: string) => DailyReport[];

  // 🔥 AJOUT POUR SYNC BACKEND
  setReports: (reports: DailyReport[]) => void;
};

export const useDailyReportStore = create<DailyReportStore>()(
  persist(
    (set, get) => ({
      reports: [],

      // 🔥 NOUVEAU
      setReports: (reports) =>
        set({
          reports,
        }),

      addReport: (report) =>
        set((state) => ({
          reports: [...state.reports, report],
        })),

      getReportsByTask: (taskId) =>
        get().reports.filter((r) => r.taskId === taskId),
    }),
    {
      name: "sitepulse-daily-reports",
    }
  )
);
