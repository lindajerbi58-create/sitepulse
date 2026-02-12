// lib/delayPredictor.ts

export function predictDelay(task: any, reports: any[]) {
  const lastReports = reports
    .filter(r => r.taskId === task.id)
    .slice(-3);

  const poorPerformance =
    lastReports.filter(r =>
      (r.actualQuantity / r.targetQuantity) < 0.7
    ).length;

  const daysLeft =
    (new Date(task.dueDate).getTime() - Date.now()) /
    (1000 * 60 * 60 * 24);

  if (poorPerformance >= 2 && daysLeft < 5) {
    return "High Risk";
  }

  if (poorPerformance >= 1) {
    return "Moderate Risk";
  }

  return "Low Risk";
}
