"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "../types/user";

type UserStore = {
  users: User[];
  currentUser: User | null;

  addUser: (user: User) => void;
  login: (user: User) => void;
  setUsers: (users: User[]) => void;
  logout: () => void;
  setCurrentUser: (user: User) => void;
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      users: [],
      currentUser: null,

      addUser: (user) =>
        set((state) => ({
          users: [...state.users, user],
        })),
 // 🔥 AJOUT POUR BACKEND SYNC
      setUsers: (users) =>
        set({
          users,
        }),
      setCurrentUser: (user) =>
        set({
          currentUser: user,
        }),

      // 🔥 Maintenant login reçoit un USER (pas email/password)
      login: (user) => {
        set({ currentUser: user });
      },

      logout: () => {
        set({ currentUser: null });
      },
    }),
    
    {
      name: "sitepulse-users",
    }
  )
);
