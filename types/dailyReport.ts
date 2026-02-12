export type DelayReason =
  | "Materials"
  | "Tools / Equipment"
  | "Logistics"
  | "Manpower"
  | "Weather"
  | "Client / Design"
  | "Safety"
  | "Other";
export type QualityLevel = "Very Good" | "Medium" | "Low";

export interface DailyReport {
  id: string;
  taskId: string;
  userId: string;
projectId: string;

  date: string;
 qualityLevel?: QualityLevel; 
  targetQuantity: number;
  actualQuantity: number;
comment?: string;

  delayReasons?: DelayReason[];

  createdAt: string;
}
