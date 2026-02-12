"use client";

import { useState } from "react";
import { useUserStore } from "../../store/useUserStore";

export default function OrganizationPage() {
  const users = useUserStore((state) => state.users);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  function renderHierarchy(parentId?: string, level = 0) {
    const children = users.filter(
      (u) =>
        u.reportsTo === parentId &&
        (u.fullName.toLowerCase().includes(search.toLowerCase()) ||
          u.role.toLowerCase().includes(search.toLowerCase())) &&
        (!departmentFilter || u.department === departmentFilter)
    );

    return children.map((user) => (
      <div key={user._id} className="mb-4">
        <div
          className="bg-[#111827] p-4 rounded-xl border border-[#1f2937] hover:border-blue-500 transition"
          style={{ marginLeft: level * 25 }}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold text-white">
                {user.fullName}
              </div>
              <div className="text-sm text-gray-400">
                {user.role}
              </div>
            </div>

            <div
              className={`text-xs px-3 py-1 rounded-full ${getRoleColor(
                user.role
              )}`}
            >
              {user.department}
            </div>
          </div>
        </div>

        {renderHierarchy(user._id, level + 1)}
      </div>
    ));
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6">
      <h1 className="text-2xl font-bold mb-6">
        Organization Hierarchy
      </h1>

      {/* Search */}
      <input
        placeholder="Search name or role..."
        className="w-full mb-4 p-3 rounded-lg bg-[#111827] border border-[#1f2937] focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Department Filter */}
      <select
        className="w-full mb-6 p-3 bg-[#111827] border border-[#1f2937] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={departmentFilter}
        onChange={(e) => setDepartmentFilter(e.target.value)}
      >
        <option value="">All Departments</option>
        <option>Construction</option>
        <option>Quality</option>
        <option>Procurement</option>
        <option>HSE</option>
        <option>Planning</option>
      </select>

      {users.length === 0 ? (
        <p className="text-gray-400">
          No users registered yet.
        </p>
      ) : (
        renderHierarchy(undefined)
      )}
    </div>
  );
}

function getRoleColor(role: string) {
  switch (role) {
    case "Project Manager":
      return "bg-purple-600";
    case "Construction Manager":
      return "bg-blue-600";
    case "Quality Manager":
      return "bg-green-600";
    case "Procurement Manager":
      return "bg-yellow-600";
    case "Supervisor":
      return "bg-orange-500";
    case "Foreman":
      return "bg-cyan-600";
    case "Worker":
      return "bg-gray-600";
    default:
      return "bg-blue-500";
  }
}
