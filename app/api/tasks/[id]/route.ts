import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/task";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const task = await Task.findById(params.id);

  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await req.json();

    const updatedTask = await Task.findByIdAndUpdate(
      params.id,
      body,
      { new: true }
    );

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();

  await Task.findByIdAndDelete(params.id);

  return NextResponse.json({ message: "Deleted" });
}
