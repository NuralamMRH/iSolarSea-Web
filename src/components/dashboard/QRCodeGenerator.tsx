import React, { useState, useRef, useEffect } from "react";
import { QrCode, Download, Copy, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import Lottie from "lottie-react";
import successAnimation from "../../animation/success.json";
import { supabase } from "@/lib/supabase";

interface QRCodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionComplete?: (transactionId: string) => void;
  transaction: {
    id: string;
    buyer_vessel_id: string;
    quantity: number;
    status: string;
    product_order_id?: string | null;
  };
}

export default function QRCodeGenerator({
  isOpen,
  onClose,
  onTransactionComplete,
  transaction,
}: QRCodeGeneratorProps) {
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string>(
    transaction.status
  );
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [productOrderInfo, setProductOrderInfo] = useState<{
    quantity_load: number | null;
    available_load: number | null;
    stock: number | null;
  } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Fetch product order information when component mounts
  useEffect(() => {
    const fetchProductOrderInfo = async () => {
      if (!transaction.product_order_id) return;

      try {
        console.log(
          "Fetching product order info for product_order_id:",
          transaction.product_order_id
        );

        // Find product orders that contain this product_order_id
        const { data: productOrders, error } = await supabase
          .from("product_orders")
          .select("quantity_load, available_load, stock")
          .eq("id", transaction.product_order_id);

        if (error) {
          console.error("Error fetching product order info:", error);
          return;
        }

        if (productOrders && productOrders.length > 0) {
          // Use the first product order found
          const productOrder = productOrders[0];
          setProductOrderInfo({
            quantity_load: productOrder.quantity_load,
            available_load: productOrder.available_load,
            stock: productOrder.stock,
          });
          console.log("Product order info loaded:", productOrder);
        } else {
          console.log(
            "No product orders found for product_order_id:",
            transaction.product_order_id
          );
        }
      } catch (error) {
        console.error("Error in fetchProductOrderInfo:", error);
      }
    };

    fetchProductOrderInfo();
  }, [transaction.product_order_id]);

  // Check transaction status periodically when QR code is generated
  useEffect(() => {
    if (!qrCodeData || isCompleted) return;

    const checkTransactionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("vessel_transactions")
          .select("status")
          .eq("id", transaction.id)
          .single();

        if (error) {
          console.error("Error checking transaction status:", error);
          return;
        }

        setTransactionStatus(data.status);

        if (data.status === "completed") {
          setIsCompleted(true);
          // Refresh product order info when transaction is completed
          if (transaction.product_order_id) {
            const { data: updatedProductOrders, error: refreshError } =
              await supabase
                .from("product_orders")
                .select("quantity_load, available_load, stock")
                .eq("id", transaction.product_order_id);

            if (
              !refreshError &&
              updatedProductOrders &&
              updatedProductOrders.length > 0
            ) {
              const updatedProductOrder = updatedProductOrders[0];
              setProductOrderInfo({
                quantity_load: updatedProductOrder.quantity_load,
                available_load: updatedProductOrder.available_load,
                stock: updatedProductOrder.stock,
              });
              console.log(
                "Product order info refreshed after completion:",
                updatedProductOrder
              );
            }
          }
          // Stop checking once completed
          return;
        }
      } catch (error) {
        console.error("Error checking transaction status:", error);
      }
    };

    // Check immediately
    checkTransactionStatus();

    // Set up interval to check every 10 seconds (less frequent)
    const interval = setInterval(checkTransactionStatus, 1000);

    return () => clearInterval(interval);
  }, [qrCodeData, transaction.id, isCompleted]);

  const generateQRCode = async () => {
    if (!transaction) return;

    setIsGenerating(true);
    try {
      // Create QR code data object
      const qrData = {
        transactionId: transaction.id,
        buyerVesselId: transaction.buyer_vessel_id,
        orderQuantity: transaction.quantity,
        timestamp: new Date().toISOString(),
      };

      // Convert to JSON string
      const qrString = JSON.stringify(qrData);
      setQrCodeData(qrString);

      // In a real implementation, you would generate an actual QR code image
      // For now, we'll just store the data string
      console.log("QR Code Data:", qrString);
    } catch (error) {
      console.error("Error generating QR code:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const downloadQRCode = async () => {
    if (!dialogRef.current) return;

    setIsDownloading(true);
    try {
      // Temporarily hide the close button and action buttons for cleaner image
      const closeButton = dialogRef.current.querySelector(
        "button[onClick]"
      ) as HTMLElement;
      const actionButtons = dialogRef.current.querySelector(
        ".action-buttons"
      ) as HTMLElement;

      if (closeButton) closeButton.style.display = "none";
      if (actionButtons) actionButtons.style.display = "none";

      // Capture the dialog as an image
      const canvas = await html2canvas(dialogRef.current, {
        backgroundColor: "#ffffff",
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        width: dialogRef.current.offsetWidth,
        height: dialogRef.current.offsetHeight,
      });

      // Restore the buttons
      if (closeButton) closeButton.style.display = "";
      if (actionButtons) actionButtons.style.display = "";

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `transaction-qr-${transaction.id.slice(0, 8)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setIsDownloading(false);
      }, "image/png");
    } catch (error) {
      console.error("Error downloading QR code image:", error);
      // Fallback to text download
      const blob = new Blob([qrCodeData], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transaction-${transaction.id.slice(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  // Show success state when transaction is completed
  if (isCompleted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Transaction Completed
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>

          {/* Success Content */}
          <div className="p-6 text-center">
            <div className="w-24 h-24 mx-auto mb-4">
              <Lottie
                animationData={successAnimation}
                loop={false}
                autoplay={true}
              />
            </div>
            <h3 className="text-xl font-semibold text-green-600 mb-2">
              Transaction Completed Successfully!
            </h3>
            <p className="text-gray-600 mb-6">
              The buyer has successfully scanned the QR code and completed the
              transaction.
            </p>

            {/* Transaction Summary */}
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h4 className="font-semibold text-gray-900 mb-2">
                Transaction Summary
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Transaction ID:</strong> {transaction.id.slice(0, 8)}
                  ...
                </p>
                <p>
                  <strong>Buyer Vessel:</strong>{" "}
                  {transaction.buyer_vessel_id.slice(0, 8)}...
                </p>
                <p>
                  <strong>Quantity:</strong> {transaction.quantity} kg
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className="text-green-600 font-medium">Completed</span>
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                // Call the callback to refetch data in parent component
                if (onTransactionComplete) {
                  onTransactionComplete(transaction.id);
                }
                onClose();
              }}
              className="w-full mt-6"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                iTruckSea Transaction QR Code
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Scan this QR code to complete your transaction
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Transaction Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Transaction Summary</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Transaction ID:</strong> {transaction.id.slice(0, 8)}...
              </p>
              <p>
                <strong>Buyer Vessel:</strong>{" "}
                {transaction.buyer_vessel_id.slice(0, 8)}...
              </p>
              <p>
                <strong>Quantity:</strong> {transaction.quantity} kg
              </p>
              <p>
                <strong>Status:</strong> {transaction.status}
              </p>
              <p>
                <strong>Generated:</strong> {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          {/* Product Order Information */}
          {/* {productOrderInfo && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-blue-900">
                Product Order Details
              </h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  <strong>Quantity Load:</strong>{" "}
                  {productOrderInfo.quantity_load || 0} kg
                </p>
                <p>
                  <strong>Available Load:</strong>{" "}
                  {productOrderInfo.available_load || 0} kg
                </p>
                <p>
                  <strong>Current Stock:</strong> {productOrderInfo.stock || 0}{" "}
                  kg
                </p>
                <p>
                  <strong>Remaining After Transaction:</strong>{" "}
                  {Math.max(
                    0,
                    (productOrderInfo.available_load || 0) -
                      transaction.quantity
                  )}{" "}
                  kg
                </p>
              </div>
            </div>
          )} */}

          {/* QR Code Generation */}
          {!qrCodeData ? (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-gray-600">
                Generate a QR code for the buyer to scan and complete this
                transaction
              </p>
              <Button
                onClick={generateQRCode}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <QRCode
                      value={qrCodeData}
                      className="w-full h-full text-gray-400 mx-auto p-3"
                    />
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className="flex items-center justify-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">
                  QR Code generated successfully
                </span>
              </div>

              {/* Transaction Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    Current Status: {transactionStatus}
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Status will update automatically when buyer scans the QR code
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 action-buttons">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Data
                    </>
                  )}
                </Button>
                <Button
                  onClick={downloadQRCode}
                  variant="outline"
                  className="flex-1"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Image
                    </>
                  )}
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 mb-2">
                  Buyer Instructions
                </h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>
                    1. <strong>Receive QR Code:</strong> Get this QR code from
                    the seller
                  </li>
                  <li>
                    2. <strong>Scan QR:</strong> Tap the "Scan QR" button in the
                    header
                  </li>
                  <li>
                    3. <strong>Confirmation:</strong> Transaction will be marked
                    as completed
                  </li>
                </ol>
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> Only the buyer vessel owner can scan
                    and complete this transaction. Make sure you're using the
                    correct vessel account.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
