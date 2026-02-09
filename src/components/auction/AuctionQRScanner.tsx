import React, { useState, useRef, useEffect } from "react";
import { Camera } from "react-camera-pro";
import { Scan, Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import jsQR from "jsqr";
import { Database } from "@/integrations/supabase/types";

interface AuctionQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVesselId: string | null;
  selectedTripId: string | null;
  onCatchRecordFound: (catchRecord: CatchRecordWithHaul) => void;
}

interface QRCodeData {
  [key: string]: string | number;
  transactionId?: string;
  buyerVesselId?: string;
  orderQuantity?: number;
  timestamp?: string;
  haulId?: string;
  catchRecordId?: string;
}

type CatchRecordWithHaul = Database["public"]["Tables"]["catch_records"]["Row"] & {
  haul_id: { id: string; haul_number: number; qr_code: string } | string;
  tank: string;
  species: string;
  fish_size: string;
  quantity: number;
  id: string;
  image_url: string;
  net_kg_per_case: string;
};

const getCameraErrorMessages = () => ({
  noCameraAccessible: "No camera device accessible. Please connect your camera or try a different browser.",
  permissionDenied: "Permission denied. Please refresh and give camera permission.",
  switchCamera: "It is not possible to switch camera to different one because there is only one video device accessible.",
  canvas: "Canvas is not supported.",
});

export default function AuctionQRScanner({
  isOpen,
  onClose,
  selectedVesselId,
  selectedTripId,
  onCatchRecordFound,
}: AuctionQRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null);
  const [scanResult, setScanResult] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [foundCatchRecord, setFoundCatchRecord] = useState<CatchRecordWithHaul | null>(null);
  const camera = useRef<{ takePhoto: () => string } | null>(null);
  const { user } = useAuth();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScannedData(null);
      setScanResult(null);
      setErrorMessage("");
      setFoundCatchRecord(null);
      setIsScanning(false);
    }
  }, [isOpen]);

  const decodeQRCode = (imageData: ImageData): string | null => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      return code ? code.data : null;
    } catch (error) {
      console.error("QR decode error:", error);
      return null;
    }
  };

  const parseQRCode = (qrText: string): QRCodeData | null => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(qrText);
      return parsed;
    } catch {
      // If not JSON, try to parse as key-value pairs
      try {
        const data: QRCodeData = {};
        const pairs = qrText.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value) {
            data[key] = isNaN(Number(value)) ? value : Number(value);
          }
        }
        return Object.keys(data).length > 0 ? data : null;
      } catch {
        return null;
      }
    }
  };

  const validateAndFindCatchRecord = async (qrData: QRCodeData): Promise<CatchRecordWithHaul> => {
    try {
      console.log("Validating QR data:", qrData);
      console.log("Selected vessel:", selectedVesselId);
      console.log("Selected trip:", selectedTripId);

      if (!selectedVesselId || !selectedTripId) {
        throw new Error("Please select a vessel and trip first");
      }

      // Try different approaches to find the catch record
      let catchRecord: CatchRecordWithHaul | null = null;

      // Approach 1: Look for catch record ID directly
      if (qrData.catchRecordId) {
        const { data, error } = await supabase
          .from("catch_records")
          .select(`
            *,
            haul_id!inner(id, haul_number, qr_code, trip_id, vessel_id)
          `)
          .eq("id", qrData.catchRecordId)
          .eq("haul_id.vessel_id", selectedVesselId)
          .eq("haul_id.trip_id", selectedTripId)
          .single();

        if (!error && data) {
          catchRecord = data as CatchRecordWithHaul;
        }
      }

      // Approach 2: Look for haul ID
      if (!catchRecord && qrData.haulId) {
        const { data, error } = await supabase
          .from("catch_records")
          .select(`
            *,
            haul_id!inner(id, haul_number, qr_code, trip_id, vessel_id)
          `)
          .eq("haul_id.id", qrData.haulId)
          .eq("haul_id.vessel_id", selectedVesselId)
          .eq("haul_id.trip_id", selectedTripId);

        if (!error && data && data.length > 0) {
          catchRecord = data[0] as CatchRecordWithHaul;
        }
      }

      // Approach 3: Look for transaction-related data
      if (!catchRecord && qrData.transactionId) {
        // Try to find catch record directly by transaction ID
        const { data: transactionData, error: transactionError } = await supabase
          .from("catch_records")
          .select(`
            *,
            haul_id!inner(id, haul_number, qr_code, trip_id, vessel_id)
          `)
          .eq("haul_id.vessel_id", selectedVesselId)
          .eq("haul_id.trip_id", selectedTripId)
          .eq("id", qrData.transactionId)
          .single();

        if (!transactionError && transactionData) {
          catchRecord = transactionData as CatchRecordWithHaul;
        }
      }

      if (!catchRecord) {
        throw new Error("No matching catch record found for the selected vessel and trip");
      }

      return catchRecord;
    } catch (error) {
      console.error("Validation error:", error);
      throw error;
    }
  };

  const getImageDataFromCanvas = (canvas: HTMLCanvasElement): ImageData | null => {
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
      setErrorMessage("");
      
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

      // Find the catch record
      const catchRecord = await validateAndFindCatchRecord(qrData);
      setFoundCatchRecord(catchRecord);
      setScanResult("success");

      // Call the callback with the found catch record
      onCatchRecordFound(catchRecord);

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

  const handleClose = () => {
    setScannedData(null);
    setScanResult(null);
    setErrorMessage("");
    setFoundCatchRecord(null);
    setIsScanning(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Scan Catch Record QR Code
            </h2>
            <button
              onClick={handleClose}
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
                  aspectRatio={1}
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

              {/* Instructions */}
              <div className="text-sm text-gray-600 text-center">
                <p>Position the QR code within the frame and tap "Scan QR Code"</p>
                {selectedVesselId && selectedTripId && (
                  <p className="mt-2 text-green-600">
                    ✓ Vessel and trip selected
                  </p>
                )}
                {(!selectedVesselId || !selectedTripId) && (
                  <p className="mt-2 text-red-600">
                    ⚠ Please select a vessel and trip first
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Scan Result */}
              <div className="text-center">
                {scanResult === "success" ? (
                  <div className="flex flex-col items-center justify-center text-green-600 mb-4">
                    <CheckCircle className="w-12 h-12 mb-2" />
                    <span className="text-lg font-semibold">
                      Catch Record Found!
                    </span>
                    {foundCatchRecord && (
                      <p className="text-sm text-gray-600 mt-2">
                        Found {foundCatchRecord.species} in Tank {foundCatchRecord.tank}
                      </p>
                    )}
                  </div>
                ) : scanResult === "error" ? (
                  <div className="flex flex-col items-center justify-center text-red-600 mb-4">
                    <XCircle className="w-12 h-12 mb-2" />
                    <span className="text-lg font-semibold">
                      Scan Failed
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Catch Record Details */}
              {foundCatchRecord && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900">
                    Catch Record Details
                  </h3>
                  <div className="text-sm text-gray-600">
                    <p><strong>Species:</strong> {foundCatchRecord.species}</p>
                    <p><strong>Tank:</strong> {foundCatchRecord.tank}</p>
                    <p><strong>Fish Size:</strong> {foundCatchRecord.fish_size}</p>
                    <p><strong>Quantity:</strong> {foundCatchRecord.quantity} kg</p>
                    <p><strong>Net Weight per Case:</strong> {foundCatchRecord.net_kg_per_case} kg</p>
                  </div>
                </div>
              )}

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
                    setFoundCatchRecord(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Scan Again
                </Button>
                <Button 
                  onClick={handleClose} 
                  className="flex-1"
                  variant={scanResult === "success" ? "default" : "outline"}
                >
                  {scanResult === "success" ? "Done" : "Close"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}