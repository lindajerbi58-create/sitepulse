import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Procurement from "@/models/procurement";

export async function GET() {
  try {
    await connectDB();
    const items = await Procurement.find().sort({ createdAt: 1 });
    return NextResponse.json(items);
  } catch (error: any) {
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

    // minimal validation
    if (!body?.id || !body?.title || body?.quantity == null || body?.unitCost == null || !body?.expectedDate || !body?.createdAt) {
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

    const newItem = await Procurement.create({
      id: body.id,
      projectId: body.projectId || "",
      title: body.title,
      supplier: body.supplier || "",
      category: body.category || "Other",
      quantity: Number(body.quantity),
      unitCost: Number(body.unitCost),
      expectedDate: body.expectedDate,
      priority: body.priority || "Medium",
      status: body.status || "Pending",
      createdAt: body.createdAt,
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to create procurement item" },
      { status: 500 }
    );
  }
}
