"use client";

import { useState } from "react";
import { useUserStore } from "../../store/useUserStore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const loginStore = useUserStore((state) => state.login);

  return (
    <div className="min-h-screen bg-[#e5e7eb] flex items-center justify-center px-4">
      <div className="w-full max-w-md border-2 border-blue-600 rounded-xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-b from-[#2d2d2d] to-[#1f2937] p-6 text-center">
          <div className="text-white text-3xl font-bold tracking-wide">
            SITEPULSE
          </div>
          <div className="text-gray-400 text-xs tracking-widest mt-1">
            ENTERPRISE EXECUTION
          </div>
        </div>

        {/* Body */}
        <div className="bg-white p-8">
          <h2 className="text-2xl font-semibold mb-1">Sign In</h2>
          <p className="text-gray-500 text-sm mb-6">
            Access your industrial project dashboard.
          </p>

          {/* Email */}
          <div className="mb-4">
            <label className="text-gray-600 text-xs uppercase">
              Corporate Email
            </label>
            <input
              type="email"
              className="w-full mt-1 border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-600 uppercase">
              <span>Password</span>
              <button className="text-blue-600 normal-case">
                Forgot Password?
              </button>
            </div>

            <input
              type="password"
              className="w-full mt-1 border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center mt-3 mb-6">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-gray-600">
              Remember this device
            </span>
          </div>

          {/* 🔥 BUTTON CONNECTED TO BACKEND */}
          <button
            onClick={async () => {
              if (!email || !password) {
                alert("Email and password required");
                return;
              }

              try {
                const res = await fetch("/api/login", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email, password }),
                });

                const data = await res.json();

                if (!res.ok) {
                  alert(data.message);
                  return;
                }

                // Sauvegarder user dans Zustand
                loginStore(data.user);

                alert("Login successful!");
                router.push("/dashboard");

              } catch (error) {
                console.error(error);
                alert("Login failed");
              }
            }}
            className="w-full bg-blue-700 hover:bg-blue-800 transition text-white p-3 rounded-md font-medium shadow-md"
          >
            Sign In
          </button>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-grow border-t"></div>
            <span className="mx-3 text-xs text-gray-500 tracking-widest">
              NEW USER
            </span>
            <div className="flex-grow border-t"></div>
          </div>

          {/* Register Button */}
          <button
            onClick={() => router.push("/register")}
            className="w-full border border-blue-600 text-blue-600 p-3 rounded-md hover:bg-blue-50 transition text-sm"
          >
            Register
          </button>

          <p className="text-center text-xs text-gray-400 mt-8">
            Need access? Contact your project administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
