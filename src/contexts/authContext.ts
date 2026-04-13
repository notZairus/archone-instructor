import { createContext, useContext } from "react";
import React from "react";

export type AuthContextType = {
  authUser: User;
  setAuthUser: React.Dispatch<React.SetStateAction<User>>;
} | null;

export const authContext = createContext<AuthContextType>(null);

export const useAuthContext = () => {
  const ctx = useContext(authContext);
  if (!ctx) {
    throw new Error("Auth context is used outside of its provider.");
  }
  return ctx;
};
