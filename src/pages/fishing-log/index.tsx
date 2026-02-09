import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function FishingLog() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/fishing-log/batch");
  }, [navigate]);

  return null;
}
