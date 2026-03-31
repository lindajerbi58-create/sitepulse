"use client";

import { create } from "zustand";
import { User } from "../types/user";

type UserStore = {
  users: User[];
  currentUser: User | null;

  addUser: (user: User) => Promise<void>;
  login: (user: User) => void;
  setUsers: (users: User[]) => void;
  logout: () => void;
  setCurrentUser: (user: User) => void;
};

export const useUserStore = create<UserStore>()((set) => ({
  users: [],
  currentUser: null,

  addUser: async (user) => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (res.ok) {
        const newUser = await res.json();
        set((state) => ({ users: [...state.users, newUser] }));
      }
    } catch (error) {
      console.error("Failed to add user:", error);
    }
  },

  setUsers: (users) => set({ users }),

  setCurrentUser: (user) => set({ currentUser: user }),

  login: (user) => {
    // If login is local (since no real auth yet), we keep it as is, 
    // but without persist, this currentUser will wipe on refresh.
    // So for currentUser, we might actually want to keep a tiny persist 
    // JUST for currentUser if we want login to survive a refresh.
    // User requested "If auth is incomplete, keep the simplest coherent approach possible"
    // Let's persist JUST currentUser? We can use sessionStorage or just localStorage directly.
    localStorage.setItem("sitepulse-current-user", JSON.stringify(user));
    set({ currentUser: user });
  },

  logout: () => {
    localStorage.removeItem("sitepulse-current-user");
    set({ currentUser: null });
  },
}));
