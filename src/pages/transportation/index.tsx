import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Transportation() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/transportation/2share-loading");
  }, [navigate]);

  return null;
}
