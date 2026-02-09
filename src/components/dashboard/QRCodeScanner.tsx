import React, { useState, useRef, useEffect } from "react";
import { Camera } from "react-camera-pro";
import { Scan, Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import jsQR from "jsqr";
import { Database } from "@/integrations/supabase/types";
import Lottie from "lottie-react";
import successAnimation from "../../animation/success.json";

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionComplete: (transactionId: string) => void;
}

interface QRCodeData {
  transactionId: string;
  buyerVesselId: string;
  orderQuantity: number;
  timestamp: string;
}

export default function QRCodeScanner({
  isOpen,
  onClose,
  onTransactionComplete,
}: QRCodeScannerProps) {
  // Function to check if camera API is available
  const isCameraAPIAvailable = () => {
    return !!(
      navigator &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  };

  // Enhanced error messages for better user experience
  const getCameraErrorMessages = () => {
    if (!isCameraAPIAvailable()) {
      return {
        noCameraAccessible: "Camera not available. Please ensure you're using HTTPS and have a camera connected.",
        permissionDenied: "Camera access denied. Please enable camera permissions in your browser settings and ensure you're using HTTPS.",
        switchCamera: "Cannot switch camera. Please try refreshing the page.",
        canvas: "Canvas not supported by your browser. Please update your browser.",
      };
    }
    
    return {
      noCameraAccessible: "No camera accessible. Please check your camera connection.",
      permissionDenied: "Camera permission denied. Please enable camera access in your browser settings.",
      switchCamera: "Cannot switch camera. Please try again.",
      canvas: "Canvas not supported. Please update your browser.",
    };
  };
  const { user } = useAuth();
  const camera = useRef<{ takePhoto: () => string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null);
  const [scanResult, setScanResult] = useState<"success" | "error" | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "bank" | "mobile"
  >("cash");

  useEffect(() => {
    if (isOpen) {
      // Load vessels when scanner opens
      fetchVessels();
    } else {
      setScannedData(null);
      setScanResult(null);
      setErrorMessage("");
    }
  }, [isOpen]);

  const [vessels, setVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);

  const parseQRCode = (qrText: string): QRCodeData | null => {
    try {
      // Expected QR code format: JSON string with transaction details
      const data = JSON.parse(qrText);

      // Validate required fields
      if (!data.transactionId || !data.buyerVesselId || !data.orderQuantity) {
        throw new Error("Invalid QR code format");
      }

      return {
        transactionId: data.transactionId,
        buyerVesselId: data.buyerVesselId,
        orderQuantity: data.orderQuantity,
        timestamp: data.timestamp || new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error parsing QR code:", error);
      return null;
    }
  };

  async function fetchVessels() {
    try {
      // Get user's auth ID
      const userId = user?.auth_id;
      if (!userId) {
        console.error("User not authenticated");
        return;
      }

      // Fetch vessels that the user owns
      const { data: ownedVessels, error: ownedError } = await supabase
        .from("vessels")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (ownedError) {
        console.error("Error fetching owned vessels:", ownedError);
      }

      // Fetch vessels that the user has access to through vessel access control
      const { data: accessData, error: accessError } = await supabase
        .from("vessel_access_control")
        .select("vessel_id")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (accessError) {
        console.error("Error fetching vessel access:", accessError);
      }

      // Get vessel IDs that user has access to
      const accessibleVesselIds =
        accessData?.map((item) => item.vessel_id) || [];

      // Fetch accessible vessels
      let accessibleVessels: Record<string, unknown>[] = [];
      if (accessibleVesselIds.length > 0) {
        const { data: accessibleData, error: accessibleError } = await supabase
          .from("vessels")
          .select("*")
          .in("id", accessibleVesselIds)
          .order("created_at", { ascending: false });

        if (accessibleError) {
          console.error("Error fetching accessible vessels:", accessibleError);
        } else {
          accessibleVessels = accessibleData || [];
        }
      }

      // Combine owned and accessible vessels, removing duplicates
      const allVessels = [...(ownedVessels || []), ...accessibleVessels];
      const uniqueVessels = allVessels.filter(
        (vessel, index, self) =>
          index === self.findIndex((v) => v.id === vessel.id)
      );

      console.log("Owned vessels:", ownedVessels?.length || 0);
      console.log("Accessible vessels:", accessibleVessels.length);
      console.log("Total unique vessels:", uniqueVessels.length);

      setVessels(uniqueVessels);
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  }
  const validateTransaction = async (qrData: QRCodeData): Promise<boolean> => {
    try {
      console.log("Validating transaction with QR data:", qrData);
      console.log(
        "Available vessels:",
        vessels.map((v) => ({ id: v.id, name: v.name }))
      );
      console.log("Looking for vessel ID:", qrData.buyerVesselId);

      const vessel = vessels.find((v) => v.id === qrData.buyerVesselId);
      console.log("Found vessel:", vessel);

      if (!vessel) {
        // If vessels are not loaded yet, try to fetch them first
        if (vessels.length === 0) {
          console.log("Vessels not loaded, fetching them first...");
          await fetchVessels();
          // Wait a bit for state to update
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Try again with updated vessels
          const updatedVessel = vessels.find(
            (v) => v.id === qrData.buyerVesselId
          );
          if (!updatedVessel) {
            throw new Error(`Vessel not found: ${qrData.buyerVesselId}`);
          }
        } else {
          // Fallback: query database directly to check if vessel exists
          console.log("Vessel not found in local state, checking database...");
          const { data: dbVessel, error: vesselError } = await supabase
            .from("vessels")
            .select("id, name, user_id")
            .eq("id", qrData.buyerVesselId)
            .single();

          if (vesselError || !dbVessel) {
            throw new Error(
              `Vessel not found in database: ${qrData.buyerVesselId}`
            );
          }

          console.log("Vessel found in database:", dbVessel);

          // Check if user has access to this vessel
          const userId = user?.auth_id;
          if (dbVessel.user_id !== userId) {
            // Check vessel access control
            const { data: accessData, error: accessError } = await supabase
              .from("vessel_access_control")
              .select("vessel_id")
              .eq("vessel_id", qrData.buyerVesselId)
              .eq("user_id", userId)
              .eq("is_active", true)
              .single();

            if (accessError || !accessData) {
              throw new Error(`No access to vessel: ${qrData.buyerVesselId}`);
            }
          }
        }
      }

      // Check if transaction exists and is in correct status
      const { data: transaction, error: transactionError } = await supabase
        .from("vessel_transactions")
        .select("*")
        .eq("id", qrData.transactionId)
        .eq("buyer_vessel_id", qrData.buyerVesselId)
        .eq("quantity", qrData.orderQuantity)
        .in("status", [
          "AuctionAccept",
          "2BuyListing",
          "2ShareLoading",
          "4ShareLoading",
        ])
        .single();

      if (transactionError || !transaction) {
        throw new Error("Transaction not found or invalid status");
      }

      return true;
    } catch (error) {
      console.error("Transaction validation error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Validation failed"
      );
      return false;
    }
  };

  const completeTransaction = async (qrData: QRCodeData) => {
    try {
      setIsScanning(true);

      console.log("Starting transaction completion for:", qrData.transactionId);
      console.log("Payment method:", paymentMethod);

      // First, let's check if the transaction exists and get its current state
      console.log("Checking if transaction exists:", qrData.transactionId);
      const { data: existingTransactions, error: checkError } = await supabase
        .from("vessel_transactions")
        .select("*")
        .eq("id", qrData.transactionId);

      if (checkError) {
        console.error("Error checking existing transaction:", checkError);
        throw new Error(`Database error: ${checkError.message}`);
      }

      if (!existingTransactions || existingTransactions.length === 0) {
        throw new Error(`Transaction not found: ${qrData.transactionId}`);
      }

      if (existingTransactions.length > 1) {
        console.warn(
          "Multiple transactions found with same ID:",
          existingTransactions
        );
        throw new Error(
          `Multiple transactions found with ID: ${qrData.transactionId}`
        );
      }

      const existingTransaction = existingTransactions[0];

      console.log("Existing transaction:", existingTransaction);

      // Check if transaction is in a valid state for completion
      const validStatuses = [
        "AuctionAccept",
        "2BuyListing",
        "2ShareLoading",
        "4ShareLoading",
      ];

      if (!validStatuses.includes(existingTransaction.status)) {
        throw new Error(
          `Transaction status '${
            existingTransaction.status
          }' is not valid for completion. Valid statuses: ${validStatuses.join(
            ", "
          )}`
        );
      }

      // Check if user has permission to update this transaction
      const userId = user?.auth_id;
      console.log("Current user ID:", userId);
      console.log(
        "Transaction buyer vessel ID:",
        existingTransaction.buyer_vessel_id
      );
      console.log(
        "Transaction seller vessel ID:",
        existingTransaction.seller_vessel_id
      );

      // Check if user owns either the buyer or seller vessel
      const { data: userVessels, error: vesselCheckError } = await supabase
        .from("vessels")
        .select("id, user_id")
        .or(
          `id.eq.${existingTransaction.buyer_vessel_id},id.eq.${existingTransaction.seller_vessel_id}`
        );

      if (vesselCheckError) {
        console.error("Error checking vessel ownership:", vesselCheckError);
      } else {
        console.log("User vessels for this transaction:", userVessels);
        const hasOwnership = userVessels?.some((v) => v.user_id === userId);
        console.log("User has ownership:", hasOwnership);
      }

      // Check vessel access control
      const { data: accessData, error: accessError } = await supabase
        .from("vessel_access_control")
        .select("vessel_id")
        .or(
          `vessel_id.eq.${existingTransaction.buyer_vessel_id},vessel_id.eq.${existingTransaction.seller_vessel_id}`
        )
        .eq("user_id", userId)
        .eq("is_active", true);

      if (accessError) {
        console.error("Error checking vessel access:", accessError);
      } else {
        console.log("User vessel access:", accessData);
        const hasAccess = accessData && accessData.length > 0;
        console.log("User has access:", hasAccess);
      }

      // Check user role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", userId)
        .single();

      if (userError) {
        console.error("Error checking user role:", userError);
      } else {
        console.log("User role:", userData?.role);
        const isAdmin =
          userData?.role &&
          ["admin", "owner", "moderator"].includes(userData.role);
        console.log("User is admin:", isAdmin);
      }

      // Start a transaction to ensure data consistency

      const { data: updatedTransactions, error: transactionError } =
        await supabase
          .from("vessel_transactions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            payment_method: paymentMethod,
          })
          .eq("id", qrData.transactionId)
          .select();

      if (transactionError) {
        alert("Transaction update error details:" + transactionError.message);
        throw new Error(
          `Failed to update transaction: ${transactionError.message}`
        );
      }

      if (!updatedTransactions || updatedTransactions.length === 0) {
        throw new Error("No rows were updated");
      }

      if (updatedTransactions.length > 1) {
        console.warn("Multiple transactions updated:", updatedTransactions);
      }

      const transaction = updatedTransactions[0];

      // Update product_orders using product_order_id
      if (transaction.product_order_id) {
        console.log(
          "Updating product order for product_order_id:",
          transaction.product_order_id
        );

        // Get current product order data
        const { data: productOrder, error: getError } = await supabase
          .from("product_orders")
          .select("available_load, quantity_load, status")
          .eq("id", transaction.product_order_id)
          .single();

        if (getError) {
          console.error("Error getting product order:", getError);
        } else if (productOrder) {
          const currentAvailableLoad = productOrder.available_load || 0;
          const currentQuantityLoad = productOrder.quantity_load || 0;

          const newAvailableLoad = Math.max(
            0,
            currentAvailableLoad - qrData.orderQuantity
          );
          const newQuantityLoad = Math.max(
            0,
            currentQuantityLoad - qrData.orderQuantity
          );

          // Determine if status should be updated to "sold out"
          const shouldMarkAsSoldOut =
            newAvailableLoad <= 0 || newQuantityLoad <= 0;
          const newStatus = shouldMarkAsSoldOut
            ? "sold out"
            : productOrder.status || "active";

          console.log(
            `Updating product order ${transaction.product_order_id}: available_load ${currentAvailableLoad} - ${qrData.orderQuantity} = ${newAvailableLoad}, quantity_load ${currentQuantityLoad} - ${qrData.orderQuantity} = ${newQuantityLoad}, status: ${newStatus}`
          );

          const { error: updateError } = await supabase
            .from("product_orders")
            .update({
              available_load: newAvailableLoad,
              quantity_load: newQuantityLoad,
              status: newStatus,
            })
            .eq("id", transaction.product_order_id);

          if (updateError) {
            console.error("Error updating product order:", updateError);
          } else {
            console.log(
              `Successfully updated product order ${transaction.product_order_id}: available_load=${newAvailableLoad}, quantity_load=${newQuantityLoad}, status=${newStatus}`
            );
          }
        } else {
          console.log(
            "No product order found for product_order_id:",
            transaction.product_order_id
          );
        }
      }

      console.log("Transaction completed successfully!");
      setScanResult("success");

      // Show success message for 3 seconds before closing
    } catch (error) {
      console.error("Transaction completion error:", error);
      setScanResult("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Completion failed"
      );
    } finally {
      setIsScanning(false);
    }
  };

  const decodeQRCode = (imageData: ImageData): string | null => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      return code ? code.data : null;
    } catch (error) {
      console.error("Error decoding QR code:", error);
      return null;
    }
  };

  const getImageDataFromCanvas = (
    canvas: HTMLCanvasElement
  ): ImageData | null => {
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.error("Error getting image data:", error);
      return null;
    }
  };

  const handleScan = async () => {
    if (!camera.current || isScanning) return;

    try {
      setIsScanning(true);
      const imageSrc = camera.current.takePhoto();

      // Create a canvas element to process the image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas context not available");
      }

      // Create an image element to load the photo
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      // Set canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image on canvas
      ctx.drawImage(img, 0, 0);

      // Get image data for QR code detection
      const imageData = getImageDataFromCanvas(canvas);
      if (!imageData) {
        throw new Error("Failed to get image data");
      }

      // Decode QR code
      const qrText = decodeQRCode(imageData);
      if (!qrText) {
        throw new Error("No QR code found in image");
      }

      console.log("Scanned QR code text:", qrText);

      // Parse the QR code data
      const qrData = parseQRCode(qrText);
      if (!qrData) {
        throw new Error("Invalid QR code format");
      }

      setScannedData(qrData);

      // Validate the transaction
      const isValid = await validateTransaction(qrData);

      if (isValid) {
        console.log(
          "Transaction validation successful, completing transaction..."
        );
        // Complete the transaction immediately
        await completeTransaction(qrData);
      } else {
        setScanResult("error");
      }
    } catch (error) {
      console.error("Scan error:", error);
      setScanResult("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to scan QR code"
      );
    } finally {
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              QR Code Scanner
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Area */}
        <div className="p-4">
          {scanResult !== "success" && scanResult !== "error" ? (
            <div className="space-y-4">
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <Camera
                  ref={camera}
                  facingMode="environment"
                  aspectRatio={9 / 16}
                  errorMessages={getCameraErrorMessages()}
                />

                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-blue-500 rounded-lg w-48 h-48 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleScan}
                disabled={isScanning}
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 mr-2" />
                    Scan QR Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Scan Result */}
              <div className="text-center">
                {scanResult === "success" ? (
                  <div className="flex flex-col items-center justify-center text-green-600 mb-4">
                    <div className="w-24 h-24 mb-4">
                      <Lottie
                        animationData={successAnimation}
                        loop={false}
                        autoplay={true}
                      />
                    </div>
                    <span className="text-lg font-semibold">
                      Transaction Completed Successfully!
                    </span>
                    <p className="text-sm text-gray-600 mt-2">
                      Your QR code has been processed and the transaction is now
                      complete.
                    </p>
                  </div>
                ) : scanResult === "error" ? (
                  <div className="flex items-center justify-center text-red-600 mb-4">
                    <XCircle className="w-8 h-8 mr-2" />
                    <span className="text-lg font-semibold">
                      Invalid QR Code
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Transaction Details */}
              {scannedData && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900">
                    Transaction Details
                  </h3>
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>Transaction ID:</strong>{" "}
                      {scannedData.transactionId.slice(0, 8)}...
                    </p>
                    <p>
                      <strong>Buyer Vessel:</strong>{" "}
                      {scannedData.buyerVesselId.slice(0, 8)}...
                    </p>
                    <p>
                      <strong>Quantity:</strong> {scannedData.orderQuantity} kg
                    </p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isScanning && scanResult === null && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                  <p className="text-sm text-gray-600">
                    Processing transaction...
                  </p>
                </div>
              )}

              {/* Payment Method Selection */}
              {/* {scanResult === "success" && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Select Payment Method
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="cash"
                        checked={paymentMethod === "cash"}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value as "cash")
                        }
                        className="text-blue-600"
                      />
                      <span>Cash on Delivery</span>
                    </label>
                    <label className="flex items-center space-x-2 opacity-50">
                      <input
                        type="radio"
                        value="bank"
                        checked={paymentMethod === "bank"}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value as "bank")
                        }
                        className="text-blue-600"
                        disabled
                      />
                      <span>Bank Transfer (Coming Soon)</span>
                    </label>
                    <label className="flex items-center space-x-2 opacity-50">
                      <input
                        type="radio"
                        value="mobile"
                        checked={paymentMethod === "mobile"}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value as "mobile")
                        }
                        className="text-blue-600"
                        disabled
                      />
                      <span>Vietnamese Mobile Banking (Coming Soon)</span>
                    </label>
                  </div>
                </div>
              )} */}

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{errorMessage}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setScannedData(null);
                    setScanResult(null);
                    setErrorMessage("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Scan Again
                </Button>
                <Button onClick={onClose} variant="outline" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
