"use client";

import { Role } from "../../types/user";
import { useState } from "react";
import { useUserStore } from "../../store/useUserStore";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Project Manager");
  const [companyCode, setCompanyCode] = useState("");
  const [reportsTo, setReportsTo] = useState<string>("");

  const users = useUserStore((state) => state.users);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0b1220] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#111827] rounded-2xl shadow-2xl p-8 border border-[#1f2937]">
        
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-xl font-bold">⚙</span>
          </div>
        </div>

        <h2 className="text-white text-2xl font-semibold text-center mb-2">
          SitePulse Registration
        </h2>

        <p className="text-gray-400 text-sm text-center mb-6">
          Create your account to access the platform.
        </p>

        {/* Full Name */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs uppercase">Full Name</label>
          <input
            className="w-full mt-1 bg-[#0f172a] border border-[#1f2937] text-white p-3 rounded-lg"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs uppercase">
            Corporate Email
          </label>
          <input
            className="w-full mt-1 bg-[#0f172a] border border-[#1f2937] text-white p-3 rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs uppercase">
            Password
          </label>
          <input
            type="password"
            className="w-full mt-1 bg-[#0f172a] border border-[#1f2937] text-white p-3 rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Department */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs uppercase">
            Department
          </label>
          <select
            className="w-full mt-1 bg-[#0f172a] border border-[#1f2937] text-white p-3 rounded-lg"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Select Department</option>
            <option>Administration</option>
            <option>Construction</option>
            <option>Quality</option>
            <option>Procurement</option>
            <option>HSE</option>
            <option>Planning</option>
          </select>
        </div>

        {/* Role */}
        <div className="mb-4">
          <label className="text-gray-400 text-xs uppercase">
            Professional Role
          </label>
          <select
            className="w-full mt-1 bg-[#0f172a] border border-[#1f2937] text-white p-3 rounded-lg"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option>Project Manager</option>
            <option>Construction Manager</option>
            <option>Quality Manager</option>
            <option>Procurement Manager</option>
            <option>Supervisor</option>
            <option>Inspector</option>
            <option>Foreman</option>
            <option>Worker</option>
          </select>
        </div>

        {/* Reports To */}
        <div className="mb-6">
          <label className="text-gray-400 text-xs uppercase">
            Reports To
          </label>
          <select
            className="w-full mt-1 bg-[#0f172a] border border-[#1f2937] text-white p-3 rounded-lg"
            value={reportsTo}
            onChange={(e) => setReportsTo(e.target.value)}
          >
            <option value="">No Manager (Top Level)</option>
            {users.map((u: any) => (
              <option key={u._id} value={u._id}>
                {u.fullName} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* Company Code */}
        <div className="mb-5">
          <label className="text-gray-400 text-sm">Company Code</label>
          <input
            className="w-full mt-2 bg-[#1f2937] border border-gray-700 rounded-lg p-3"
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value)}
          />
        </div>

        {/* Button */}
        <button
          onClick={async () => {
            if (!fullName || !email || !department || !role || !password) {
              alert("All fields required");
              return;
            }

            if (companyCode !== "LILI") {
              alert("Invalid Company Code.");
              return;
            }

            try {
              const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fullName,
                  email,
                  password,
                  role,
                  department,
                  reportsTo: reportsTo || null, // ✅ correction ici
                }),
              });

              const data = await res.json();

              if (!res.ok) {
                alert(data.message);
                return;
              }

              alert("Registration successful!");
              router.push("/dashboard");

            } catch (err) {
              alert("Something went wrong.");
            }
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium shadow-lg"
        >
          Confirm & Login →
        </button>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/login")}
            className="text-blue-400 text-sm hover:underline"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
