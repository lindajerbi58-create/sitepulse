import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Daily from "../../../models/daily";

export async function GET() {
  try {
    await connectDB();

    const dailies = await Daily.find()
      .populate("user")
      .sort({ createdAt: -1 });

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

    const { userId, date, workDone, issues, plansTomorrow } =
      await req.json();

    if (!userId || !workDone) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const newDaily = await Daily.create({
      user: userId,
      date,
      workDone,
      issues,
      plansTomorrow,
    });

    return NextResponse.json(newDaily);

  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
