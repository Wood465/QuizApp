import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminRoute({ children }) {
  const { currentUser, authReady } = useAuth();

  if (!authReady) {
    return <main className="simple-page">Nalagam prijavo...</main>;
  }

  if (!currentUser || currentUser.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminRoute;
