import { useState } from "react";
import AuthForms from "../components/AuthForms";
import { useAuthStore } from "../store/authStore";
import { Navigate, useNavigate, useLocation } from "react-router-dom";

export default function AuthPage() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated());
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthForms onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
