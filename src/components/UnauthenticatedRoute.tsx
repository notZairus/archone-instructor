import React from "react";
import { useAuthContext } from "@/contexts/authContext";
import { Navigate } from "react-router";

const UnauthenticatedRoute = ({ children }: { children: React.ReactNode }) => {
  const { authUser } = useAuthContext();

  if (authUser) {
    return <Navigate to="/home" />;
  }

  return <>{children}</>;
};

export default UnauthenticatedRoute;
