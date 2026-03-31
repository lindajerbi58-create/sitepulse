"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProcurementStore } from "@/store/useProcurementStore";

export default function ProcurementNewPage() {
  const router = useRouter();
  const { items, budgetLimit, addItem } = useProcurementStore();

  const [title, setTitle] = useState("");
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("Other");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [expectedDate, setExpectedDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const committedTotal = useMemo(() => {
    return items
      .filter((item: any) =>
        ["Pending Confirmation", "Confirmed", "Delivered"].includes(item.status)
      )
      .reduce((sum: number, item: any) => sum + Number(item.totalCost || 0), 0);
  }, [items]);

  const remainingBudget = budgetLimit - committedTotal;
  const totalCost = Number(quantity || 0) * Number(unitCost || 0);
  const exceedsBudget = totalCost > remainingBudget;

  const handleCreateOrder = async () => {
    setMessage("");

    if (!title.trim()) {
      setMessage("Please enter an item name.");
      return;
    }

    if (!expectedDate) {
      setMessage("Please choose an expected date.");
      return;
    }

    if (quantity <= 0) {
      setMessage("Quantity must be greater than 0.");
      return;
    }

    if (unitCost < 0) {
      setMessage("Unit cost must be valid.");
      return;
    }

    if (exceedsBudget) {
      setMessage("We do not have the necessary budget for these prices.");
      return;
    }

    try {
      setSaving(true);

      const order = {
        id: crypto.randomUUID(),
        projectId,
        title: title.trim(),
        supplier: supplier.trim(),
        category,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        totalCost,
        expectedDate: new Date(expectedDate).toISOString(),
        priority,
        status: "Pending Confirmation",
        note: note.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await addItem(order as any);

      if (!result.ok) {
        setMessage(result.message || "Failed to create order.");
        return;
      }

      setMessage("Order created successfully and is pending confirmation.");
      router.push("/procurement");
    } catch (error) {
      console.error(error);
      setMessage("Failed to create order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-8">
      <div className="max-w-3xl mx-auto bg-[#111827] rounded-2xl border border-gray-800 p-8">
        <h1 className="text-2xl font-bold mb-6">Create Procurement Order</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">Item Name</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
              placeholder="e.g. Stainless steel pipe"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Supplier</label>
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
              placeholder="Supplier name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
              placeholder="Materials / Electronics / Other"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Unit Cost</label>
            <input
              type="number"
              min={0}
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Expected Date</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">Project ID (optional)</label>
            <input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
              placeholder="Optional project id"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-2">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full bg-[#0b1220] border border-gray-700 rounded-lg px-3 py-2"
              placeholder="Extra details for the order"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2 bg-[#0b1220] border border-gray-700 rounded-xl p-4">
          <p>Budget Limit: <span className="font-bold">${budgetLimit.toFixed(2)}</span></p>
          <p>Already Committed: <span className="font-bold">${committedTotal.toFixed(2)}</span></p>
          <p>Remaining Budget: <span className="font-bold">${remainingBudget.toFixed(2)}</span></p>
          <p>Total Order Cost: <span className="font-bold">${totalCost.toFixed(2)}</span></p>
          <p>
            Status at creation:{" "}
            <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">
              Pending Confirmation
            </span>
          </p>
          {exceedsBudget && (
            <p className="text-red-400 font-semibold">
              We do not have the necessary budget for these prices.
            </p>
          )}
        </div>

        {message && (
          <div className="mt-4 text-sm text-cyan-300">{message}</div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleCreateOrder}
            disabled={saving || exceedsBudget}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Order"}
          </button>

          <button
            onClick={() => router.push("/procurement")}
            className="bg-gray-700 hover:bg-gray-600 px-5 py-3 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}