import React from "react";
import QRCodeScanner from "@/components/dashboard/QRCodeScanner";
import { useNavigate } from "react-router-dom";

export default function QRScannerPage() {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = React.useState(true);

  const handleTransactionComplete = (transactionId: string) => {
    console.log("Transaction completed:", transactionId);
    // Navigate back to transactions page
    navigate("/processing-plant/order");
  };

  const handleClose = () => {
    setShowScanner(false);
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <QRCodeScanner
        isOpen={showScanner}
        onClose={handleClose}
        onTransactionComplete={handleTransactionComplete}
      />
    </div>
  );
}
