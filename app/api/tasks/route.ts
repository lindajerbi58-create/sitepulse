import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/task";

export async function GET() {
  await connectDB();

  const tasks = await Task.find();

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const newTask = await Task.create(body);

    return NextResponse.json(newTask);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
