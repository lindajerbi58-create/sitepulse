import { create } from "zustand";
import { ProcurementItem } from "@/types/procurement";

interface ProcurementStore {
  items: ProcurementItem[];
  budgetLimit: number;

  setBudgetLimit: (value: number) => void;

  setItems: (items: ProcurementItem[]) => void; // ✅ AJOUT

  addItem: (item: ProcurementItem) => void;

  updateItem: (
    id: string,
    patch: Partial<ProcurementItem>
  ) => void;
  
}

export const useProcurementStore =
  create<ProcurementStore>((set) => ({
    items: [],
    budgetLimit: 100000,

    setBudgetLimit: (value) =>
      set(() => ({
        budgetLimit: value,
      })),

    setItems: (items) =>
      set(() => ({
        items,
      })),

    addItem: (item) =>
      set((state) => ({
        items: [...state.items, item],
      })),

    updateItem: (id, patch) =>
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id
            ? { ...item, ...patch }
            : item
        ),
      })),
  }));
