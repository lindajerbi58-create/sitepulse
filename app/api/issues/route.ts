import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Issue from "@/models/issue";

export async function GET() {
  await connectDB();
  const issues = await Issue.find();
  return NextResponse.json(issues);
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const newIssue = await Issue.create(body);

    return NextResponse.json(newIssue);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
