export function calculateHealthScore({
  avgPerformance,
  openIssues,
  delayedTasks,
  financialRisk,
  supplyRisk,
}: {
  avgPerformance: number;
  openIssues: number;
  delayedTasks: number;
  financialRisk: number;
  supplyRisk: number;
}) {
  let score = 100;

  score -= (100 - avgPerformance) * 0.3;
  score -= openIssues * 2;
  score -= delayedTasks * 3;
  score -= financialRisk * 0.2;
  score -= supplyRisk * 0.1;

  return Math.max(0, Math.min(100, Math.round(score)));
}
