import { NextResponse } from "next/server";
import{connectDB} from "@/lib/mongodb";
import User from "@/models/user";

// 🔹 GET ALL USERS
export async function GET() {
  try {
    await connectDB();
    const users = await User.find().sort({ createdAt: 1 });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// 🔹 CREATE USER
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const newUser = await User.create({
      fullName: body.fullName,
      email: body.email,
      role: body.role,
      department: body.department,
      reportsTo: body.reportsTo || null,
    });

    return NextResponse.json(newUser);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
