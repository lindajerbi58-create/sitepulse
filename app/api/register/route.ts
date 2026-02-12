import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import User from "../../../models/user";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    console.log("BODY RECEIVED:", body);

    const { fullName, email, password, role, department, reportsTo } = body;

    if (!password) {
      return NextResponse.json(
        { message: "Password is missing" },
        { status: 400 }
      );
    }

    // Vérifier email existant
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔥 IMPORTANT : conversion sécurisée
    let managerId = null;

    if (reportsTo && mongoose.Types.ObjectId.isValid(reportsTo)) {
      managerId = new mongoose.Types.ObjectId(reportsTo);
    }

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role,
      department,
      reportsTo: managerId,
    });

    return NextResponse.json({
      message: "User registered successfully",
      user: {
        id: newUser._id.toString(),
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        reportsTo: newUser.reportsTo,
      },
    });

  } catch (error: any) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json(
      { message: error.message || "Registration failed" },
      { status: 500 }
    );
  }
}
