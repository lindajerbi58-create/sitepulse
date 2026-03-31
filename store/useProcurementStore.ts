import { create } from "zustand";
import { ProcurementItem } from "@/types/procurement";

interface ProcurementStore {
  items: ProcurementItem[];
  budgetLimit: number;

  setBudgetLimit: (value: number) => void;
  setItems: (items: ProcurementItem[]) => void;

  addItem: (item: ProcurementItem) => Promise<{ ok: boolean; message?: string }>;

  updateItem: (
    id: string,
    patch: Partial<ProcurementItem>
  ) => Promise<{ ok: boolean; message?: string }>;
}

export const useProcurementStore = create<ProcurementStore>((set) => ({
  items: [],
  budgetLimit: 100000,

  setBudgetLimit: (value) => set(() => ({ budgetLimit: value })),
  setItems: (items) => set(() => ({ items })),

  addItem: async (item) => {
    try {
      const res = await fetch("/api/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });

      const text = await res.text();

      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Invalid JSON from POST /api/procurement:", text);
          return { ok: false, message: "Invalid response from server" };
        }
      }

      if (res.ok) {
        if (data) {
          set((state) => ({ items: [...state.items, data] }));
        }
        return { ok: true };
      }

      return {
        ok: false,
        message: data?.message || "Failed to add order",
      };
    } catch (error) {
      console.error("Failed to add procurement item:", error);
      return { ok: false, message: "Network error while adding order" };
    }
  },
  updateItem: async (id, patch) => {
    try {
      const res = await fetch(`/api/procurement/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const text = await res.text();

      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Invalid JSON from PUT /api/procurement/[id]:", text);
          return {
            ok: false,
            message: "Invalid response from server",
          };
        }
      }

      if (!res.ok) {
        return {
          ok: false,
          message: data?.message || "Failed to update procurement item",
        };
      }

      if (data) {
        set((state) => ({
          items: state.items.map((item) =>
            item._id === id || item.id === id ? { ...item, ...data } : item
          ),
        }));
      }

      return { ok: true };
    } catch (error) {
      console.error("Failed to update procurement item:", error);
      return { ok: false, message: "Network error while updating order" };
    }
  },
}));