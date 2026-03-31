"use client";

import { useEffect, useMemo, useState } from "react";
import { useProcurementStore } from "@/store/useProcurementStore";
import Link from "next/link";

type ProcurementStatus =
  | "Pending Confirmation"
  | "Confirmed"
  | "Cancelled"
  | "Delivered";

export default function ProcurementPage() {
  const {
    items,
    updateItem,
    budgetLimit,
    setItems,
    setBudgetLimit,
  } = useProcurementStore();

  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");

  const today = new Date();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/procurement", { cache: "no-store" });
        const text = await res.text();

        if (!text) {
          throw new Error("Empty response from /api/procurement");
        }

        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Invalid JSON from /api/procurement:", text);
          throw new Error("Invalid JSON returned by /api/procurement");
        }

        if (!res.ok) {
          throw new Error(data?.message || "Failed to fetch procurement data");
        }

        if (Array.isArray(data?.items)) {
          setItems(data.items);
        } else if (Array.isArray(data)) {
          setItems(data);
        } else {
          setItems([]);
        }

        if (typeof data?.budgetLimit === "number") {
          setBudgetLimit(data.budgetLimit);
        }
      } catch (err) {
        console.error("Procurement fetch failed", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [setItems, setBudgetLimit]);
  const normalizeStatus = (status: string) =>
    String(status || "").trim().toLowerCase();
  const activeItems = useMemo(() => {
    return items.filter((item: any) => {
      const status = normalizeStatus(item.status);
      return status !== "cancelled";
    });
  }, [items]);

  const pendingItems = useMemo(() => {
    return items.filter(
      (item: any) => normalizeStatus(item.status) === "pending confirmation"
    );
  }, [items]);

  const confirmedItems = useMemo(() => {
    return items.filter(
      (item: any) => normalizeStatus(item.status) === "confirmed"
    );
  }, [items]);

  const cancelledItems = useMemo(() => {
    return items.filter(
      (item: any) => normalizeStatus(item.status) === "cancelled"
    );
  }, [items]);

  const deliveredItems = useMemo(() => {
    return items.filter(
      (item: any) => normalizeStatus(item.status) === "delivered"
    );
  }, [items]);

  const totalCommitted = useMemo(() => {
    return activeItems.reduce((sum: number, item: any) => {
      const qty = Number(item.quantity || 0);
      const unit = Number(item.unitCost || 0);
      const total = Number(item.totalCost);
      return sum + total;
    }, 0);
  }, [activeItems]);

  const totalPending = useMemo(() => {
    return pendingItems.reduce(
      (sum: number, item: any) => sum + Number(item.totalCost || item.quantity * item.unitCost || 0),
      0
    );
  }, [pendingItems]);

  const totalConfirmed = useMemo(() => {
    return confirmedItems.reduce(
      (sum: number, item: any) => sum + Number(item.totalCost || item.quantity * item.unitCost || 0),
      0
    );
  }, [confirmedItems]);

  const remainingBudget = useMemo(() => {
    return Math.max(Number(budgetLimit || 0) - Number(totalCommitted || 0), 0);
  }, [budgetLimit, totalCommitted]);

  const sortedItems = [...items].sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleStatusChange = async (
    itemId: string,
    nextStatus: ProcurementStatus
  ) => {
    setActionMessage("");

    const result = await updateItem(itemId, { status: nextStatus } as any);

    if (!result.ok) {
      setActionMessage(result.message || "Failed to update order.");
      return;
    }

    setActionMessage(`Order updated to ${nextStatus}.`);
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "Pending Confirmation":
        return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
      case "Confirmed":
        return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
      case "Cancelled":
        return "bg-red-500/20 text-red-300 border border-red-500/30";
      case "Delivered":
        return "bg-green-500/20 text-green-300 border border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
    }
  };

  const isLate = (expectedDate: string, status: string) => {
    if (status === "Cancelled" || status === "Delivered") return false;
    return new Date(expectedDate) < today;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        Loading procurement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Global Procurement Control</h1>

        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg"
          >
            Back
          </Link>

          <Link
            href="/procurement/new"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
          >
            + New Order
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-4 py-3 rounded-xl">
          {actionMessage}
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-6 mb-10">
        <Kpi
          title="Budget Limit"
          value={`$${budgetLimit.toFixed(2)}`}
          color="blue"
        />

        <Kpi
          title="Committed"
          value={`$${totalCommitted.toFixed(2)}`}
          color="yellow"
        />

        <Kpi
          title="Remaining Budget"
          value={`$${remainingBudget.toFixed(2)}`}
          color={remainingBudget <= budgetLimit * 0.2 ? "red" : "green"}
        />

        <Kpi
          title="Pending Orders"
          value={`${pendingItems.length} ($${totalPending.toFixed(2)})`}
          color="yellow"
        />

        <Kpi
          title="Confirmed Orders"
          value={`${confirmedItems.length} ($${totalConfirmed.toFixed(2)})`}
          color="blue"
        />
      </div>

      <div className="mb-8 bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-3">Budget Summary</h2>
        <div className="space-y-2 text-sm text-gray-300">
          <p>Total budget: <span className="font-bold text-white">${budgetLimit.toFixed(2)}</span></p>
          <p>Committed budget: <span className="font-bold text-white">${totalCommitted.toFixed(2)}</span></p>
          <p>Remaining budget: <span className="font-bold text-white">${remainingBudget.toFixed(2)}</span></p>
          <p>Orders in progress: <span className="font-bold text-white">{activeItems.length}</span></p>
          <p>Cancelled orders: <span className="font-bold text-white">{cancelledItems.length}</span></p>
          <p>Delivered orders: <span className="font-bold text-white">{deliveredItems.length}</span></p>
        </div>
      </div>

      <div className="space-y-6">
        {sortedItems.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl text-gray-400">
            No procurement orders found.
          </div>
        ) : (
          sortedItems.map((item: any) => {
            const totalCost = Number(item.totalCost || item.quantity * item.unitCost || 0);
            const late = isLate(item.expectedDate, item.status);

            return (
              <div
                key={item._id || item.id}
                className={`bg-[#111827] p-6 rounded-2xl border shadow-lg ${late ? "border-red-600" : "border-gray-800"
                  }`}
              >
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{item.title}</h2>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(item.status)}`}>
                        {item.status}
                      </span>

                      {late && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                          Late
                        </span>
                      )}

                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {item.priority || "Medium"}
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-300 border border-slate-500/30">
                        {item.category || "Other"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-300">
                      <p>Supplier: <span className="text-white">{item.supplier || "N/A"}</span></p>
                      <p>Quantity: <span className="text-white">{item.quantity}</span></p>
                      <p>Unit Cost: <span className="text-white">${Number(item.unitCost || 0).toFixed(2)}</span></p>
                      <p>Total Cost: <span className="text-blue-400 font-bold">${totalCost.toFixed(2)}</span></p>
                      <p>Expected Date: <span className="text-white">{item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : "N/A"}</span></p>
                      <p>Created At: <span className="text-white">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}</span></p>
                      {item.note && (
                        <p>Note: <span className="text-white">{item.note}</span></p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <button
                      onClick={() =>
                        handleStatusChange(item._id || item.id, "Pending Confirmation")
                      }
                      className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg text-sm"
                    >
                      Set Pending
                    </button>

                    <button
                      onClick={() =>
                        handleStatusChange(item._id || item.id, "Confirmed")
                      }
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
                    >
                      Confirm
                    </button>

                    <button
                      onClick={() =>
                        handleStatusChange(item._id || item.id, "Cancelled")
                      }
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() =>
                        handleStatusChange(item._id || item.id, "Delivered")
                      }
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm"
                    >
                      Mark Delivered
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: "blue" | "yellow" | "red" | "green";
}) {
  const colors: Record<string, string> = {
    blue: "border-blue-500 text-blue-400",
    yellow: "border-yellow-500 text-yellow-400",
    red: "border-red-500 text-red-400",
    green: "border-green-500 text-green-400",
  };

  return (
    <div
      className={`bg-[#111827] p-6 rounded-2xl border ${colors[color]} shadow-xl`}
    >
      <p className="text-gray-400 text-sm">{title}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  );
}