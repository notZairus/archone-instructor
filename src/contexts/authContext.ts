import { createContext, useContext } from "react";
import React from "react";
import type { User } from "@/types/global";

export type AuthContextType = {
  authUser: User | null;
  setAuthUser: React.Dispatch<React.SetStateAction<User | null>>;
};

export const authContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => {
  const ctx = useContext(authContext);
  if (!ctx) {
    throw new Error("Auth context is used outside of its provider.");
  }
  return ctx;
};
