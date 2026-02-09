import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuctionMarket() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/auction-market/auction`);
  }, [navigate]);

  return null;
}
