import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Procurement from "@/models/procurement";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const BUDGET_LIMIT = 100000;

export async function PUT(req: Request, context: RouteContext) {
  try {
    await connectDB();

    const { id } = await context.params;
    const body = await req.json();

    const existing = await Procurement.findOne({
      $or: [{ _id: id }, { id }],
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Procurement item not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.supplier !== undefined) updateData.supplier = body.supplier;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.expectedDate !== undefined) updateData.expectedDate = body.expectedDate;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.note !== undefined) updateData.note = body.note;

    if (body.quantity !== undefined) {
      const quantity = Number(body.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json(
          { message: "Quantity must be greater than 0" },
          { status: 400 }
        );
      }
      updateData.quantity = quantity;
    }

    if (body.unitCost !== undefined) {
      const unitCost = Number(body.unitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        return NextResponse.json(
          { message: "Unit cost must be valid" },
          { status: 400 }
        );
      }
      updateData.unitCost = unitCost;
    }

    const nextQuantity =
      updateData.quantity !== undefined ? updateData.quantity : Number(existing.quantity);

    const nextUnitCost =
      updateData.unitCost !== undefined ? updateData.unitCost : Number(existing.unitCost);

    updateData.totalCost = nextQuantity * nextUnitCost;

    if (body.status !== undefined) {
      const allowed = ["Pending Confirmation", "Confirmed", "Cancelled", "Delivered"];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { message: "Invalid status" },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    const activeItems = await Procurement.find({
      _id: { $ne: existing._id },
      status: { $in: ["Pending Confirmation", "Confirmed", "Delivered"] },
    });

    const alreadyCommitted = activeItems.reduce(
      (sum, item) => sum + Number(item.totalCost || 0),
      0
    );

    const nextStatus =
      updateData.status !== undefined ? updateData.status : existing.status;

    const futureCommitted =
      nextStatus === "Cancelled"
        ? alreadyCommitted
        : alreadyCommitted + updateData.totalCost;

    if (futureCommitted > BUDGET_LIMIT) {
      return NextResponse.json(
        {
          message:
            "Not enough budget available for this order. We do not have the necessary budget for these prices.",
          remainingBudget: BUDGET_LIMIT - alreadyCommitted,
          requestedCost: updateData.totalCost,
        },
        { status: 400 }
      );
    }

    const updated = await Procurement.findOneAndUpdate(
      { _id: existing._id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to update procurement item" },
      { status: 500 }
    );
  }
}