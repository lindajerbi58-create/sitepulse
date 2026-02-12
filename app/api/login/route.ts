import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import User from "../../../models/user";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ✅ récupère la vraie valeur même si le schema masque user.password
    const raw = (user as any)._doc ?? user.toObject();
    const hashedPassword = raw.password;

    if (!hashedPassword) {
      return NextResponse.json(
        { message: "User record missing password field" },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: "Login successful",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        reportsTo: user.reportsTo,
      },
    });
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}