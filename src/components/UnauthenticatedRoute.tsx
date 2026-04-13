import React from "react";
import { useAuthContext } from "@/contexts/authContext";
import { Navigate } from "react-router";

const UnauthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { authUser } = useAuthContext();

  if (authUser) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

export default UnauthenticatedRoute;
