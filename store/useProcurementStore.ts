import { create } from "zustand";
import { ProcurementItem } from "@/types/procurement";

interface ProcurementStore {
  items: ProcurementItem[];
  budgetLimit: number;

  setBudgetLimit: (value: number) => void;

  setItems: (items: ProcurementItem[]) => void;

  addItem: (item: ProcurementItem) => Promise<void>;

  updateItem: (
    id: string,
    patch: Partial<ProcurementItem>
  ) => Promise<void>;
  
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
      if (res.ok) {
        const newItem = await res.json();
        set((state) => ({ items: [...state.items, newItem] }));
      }
    } catch (error) {
      console.error("Failed to add procurement item:", error);
    }
  },

  updateItem: async (id, patch) => {
    set((state) => ({
      items: state.items.map((item) =>
        item._id === id || item.id === id ? { ...item, ...patch } : item
      ),
    }));
    try {
      const res = await fetch(`/api/procurement/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        console.error("Failed to update procurement item on backend");
      }
    } catch (error) {
      console.error("Failed to update procurement item:", error);
    }
  },
}));
