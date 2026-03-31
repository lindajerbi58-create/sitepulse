import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Daily from "../../../models/daily";

export async function GET() {
  try {
    await connectDB();

    const dailies = await Daily.find().sort({ createdAt: -1 });

    return NextResponse.json(dailies);

  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body?.userId || !body?.taskId || body?.targetQuantity == null || body?.actualQuantity == null) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const newDaily = await Daily.create(body);

    return NextResponse.json(newDaily);

  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
