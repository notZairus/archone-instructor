import React from "react";
import { useAuthContext } from "@/contexts/authContext";
import { Navigate } from "react-router";

const AuthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { authUser } = useAuthContext();

  if (!authUser) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default AuthenticatedRoute;
