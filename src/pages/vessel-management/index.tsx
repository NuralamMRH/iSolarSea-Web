import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function VesselManagement() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/vessel-management/data");
  }, [navigate]);

  return null;
}
