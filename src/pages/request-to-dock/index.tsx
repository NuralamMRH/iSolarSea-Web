import { useAuthStore } from "@/stores/auth-store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function RequestToDock() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user.role === "Admin") {
      navigate("/request-to-dock/port-info");
    } else {
      navigate("/request-to-dock/departure");
    }
  }, [navigate]);

  return null;
}
