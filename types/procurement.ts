export type ProcurementStatus =
  | "Pending"
  | "Ordered"
  | "En Cours"
  | "Delivered";

export type ProcurementPriority =
  | "High"
  | "Medium"
  | "Low";
export interface ProcurementItem {
  id: string;
  title: string;
  supplier: string;
  quantity: number;
  unitCost: number;

  requestedBy: string;      // ✅ AJOUT
  requestDate: string;      // ✅ AJOUT
  expectedDate: string;
  createdAt: string;        // ✅ IMPORTANT POUR LE GRAPH

  priority: "High" | "Medium" | "Low";
  status: "Pending" | "Ordered" | "Delivered" | "En Cours";
category?: string;
projectId: string;

  relatedTaskId?: string;
}

