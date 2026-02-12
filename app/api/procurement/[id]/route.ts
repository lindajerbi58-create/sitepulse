import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Procurement from "@/models/procurement";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const item = await Procurement.findOne({ id: params.id });

    if (!item) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch procurement item" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const patch = await req.json();

    const updated = await Procurement.findOneAndUpdate(
      { id: params.id },
      { $set: patch },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to update procurement item" },
      { status: 500 }
    );
  }
}
