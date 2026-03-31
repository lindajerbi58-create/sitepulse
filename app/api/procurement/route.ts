import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Procurement from "@/models/procurement";

const BUDGET_LIMIT = 100000;

export async function GET() {
  try {
    await connectDB();

    const items = await Procurement.find().sort({ createdAt: 1 });

    return NextResponse.json({
      items,
      budgetLimit: BUDGET_LIMIT,
    });
  } catch (error: any) {
    console.error("GET /api/procurement error =", error);

    return NextResponse.json(
      { message: error.message || "Failed to fetch procurement items" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    if (
      !body?.id ||
      !body?.title ||
      body?.quantity == null ||
      body?.unitCost == null ||
      !body?.expectedDate ||
      !body?.createdAt
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const exists = await Procurement.findOne({ id: body.id });

    if (exists) {
      return NextResponse.json(
        { message: "Procurement item already exists" },
        { status: 400 }
      );
    }

    const quantity = Number(body.quantity);
    const unitCost = Number(body.unitCost);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      return NextResponse.json(
        { message: "Unit cost must be valid" },
        { status: 400 }
      );
    }

    const totalCost = quantity * unitCost;

    const existingItems = await Procurement.find({
      status: { $in: ["Pending Confirmation", "Confirmed", "Delivered"] },
    });

    const alreadyCommitted = existingItems.reduce(
      (sum, item: any) =>
        sum + Number(item.totalCost || Number(item.quantity) * Number(item.unitCost) || 0),
      0
    );

    const remainingBudget = BUDGET_LIMIT - alreadyCommitted;

    if (totalCost > remainingBudget) {
      return NextResponse.json(
        {
          message:
            "We do not have the necessary budget for these prices.",
          remainingBudget,
          requestedCost: totalCost,
        },
        { status: 400 }
      );
    }

    const newItem = await Procurement.create({
      id: body.id,
      projectId: body.projectId || "",
      title: body.title,
      supplier: body.supplier || "",
      category: body.category || "Other",
      quantity,
      unitCost,
      totalCost,
      expectedDate: body.expectedDate,
      priority: body.priority || "Medium",
      status: body.status || "Pending Confirmation",
      note: body.note || "",
      createdAt: body.createdAt,
      updatedAt: body.updatedAt || new Date().toISOString(),
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/procurement error =", error);

    return NextResponse.json(
      { message: error.message || "Failed to create procurement item" },
      { status: 500 }
    );
  }
}