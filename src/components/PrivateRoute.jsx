// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");
  const location = useLocation();

  // Only redirect outside render loop using a clean conditional
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
