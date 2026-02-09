import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ProcessingPlant() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/processing-plant/company-profile");
  }, [navigate]);

  return null;
}
