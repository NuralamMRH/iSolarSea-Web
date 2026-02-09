import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera } from "react-camera-pro";
import { FaCamera, FaImage, FaSync } from "react-icons/fa";
import { Scan, Loader2, Settings } from "lucide-react";
import CameraSettings from "../ui/CameraSettings";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { GOOGLE_API_KEY } from "@/lib/constants";

// Camera API availability check
const isCameraAPIAvailable = (): boolean => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    navigator.mediaDevices.enumerateDevices
  );
};

// Safe getUserMedia function
const getUserMediaSafely = async (
  constraints: MediaStreamConstraints
): Promise<MediaStream | null> => {
  if (!isCameraAPIAvailable()) {
    console.warn("Camera API not available");
    return null;
  }

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error("getUserMedia failed:", error);
    return null;
  }
};

// Safe enumerateDevices function
const enumerateDevicesSafely = async (): Promise<MediaDeviceInfo[]> => {
  if (!isCameraAPIAvailable()) {
    console.warn("Camera API not available");
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
  } catch (error) {
    console.error("enumerateDevices failed:", error);
    return [];
  }
};

interface CameraSettings {
  selectedCamera: string;
  resolution: string;
  facingMode: "user" | "environment";
  isMaskEnabled: boolean;
  isLiveDetectionEnabled: boolean;
}

interface FishAnalysisResult {
  success: boolean;
  processor: string;
  analysis: {
    en: {
      common_name: string;
      species: string;
      total_number_of_fish: string;
      average_fish_size: string;
      estimated_weight_per_fish: string;
      total_estimated_weight: string;
    };
    vi: {
      common_name: string;
      species: string;
      total_number_of_fish: string;
      average_fish_size: string;
      estimated_weight_per_fish: string;
      total_estimated_weight: string;
    };
  };
  timestamp: string;
}

interface StandardizedFishData {
  en: {
    common_name: string;
    species: string;
    total_number_of_fish: string;
    average_fish_size: string;
    estimated_weight_per_fish: string;
    total_estimated_weight: string;
  };
  vi: {
    common_name: string;
    species: string;
    total_number_of_fish: string;
    average_fish_size: string;
    estimated_weight_per_fish: string;
    total_estimated_weight: string;
  };
}

interface FishScanComponentProps {
  onCapture?: (imageData: string) => void;
  onError?: (error: string) => void;
  setShowFishScan?: (show: boolean) => void;
}

const FishScanComponent: React.FC<FishScanComponentProps> = ({
  onCapture,
  onError,
  setShowFishScan,
}) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scannedData, setScannedData] = useState<FishAnalysisResult | null>(null);
  const [fishDetected, setFishDetected] = useState(false);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    selectedCamera: "",
    resolution: "1920x1080",
    facingMode: window.innerWidth < 1000 ? "environment" : "user", // Back camera for mobile devices
    isMaskEnabled: false,
    isLiveDetectionEnabled: true,
  });

  const cameraRef = useRef<{ takePhoto: () => string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize cameras
  const initializeCameras = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);

    try {
      const cameras = await enumerateDevicesSafely();
      setAvailableCameras(cameras);

      if (cameras.length > 0) {
        const defaultCamera = cameras[0];
        setCameraSettings((prev) => ({
          ...prev,
          selectedCamera: defaultCamera.deviceId,
        }));
      } else {
        setCameraError("No cameras found");
        onError?.("No cameras found");
      }
    } catch (error) {
      const errorMessage = "Failed to initialize cameras";
      setCameraError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  }, [onError]);

  useEffect(() => {
    initializeCameras();
  }, [initializeCameras]);

  // Handle camera settings change
  const handleSettingChange = (key: keyof CameraSettings, value: string) => {
    setCameraSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Standardize language data function
  const standardizeLanguageData = (text: string): StandardizedFishData => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.includes("----"));
    const result: StandardizedFishData = {
      en: {
        common_name: "",
        species: "",
        total_number_of_fish: "",
        average_fish_size: "",
        estimated_weight_per_fish: "",
        total_estimated_weight: "",
      },
      vi: {
        common_name: "",
        species: "",
        total_number_of_fish: "",
        average_fish_size: "",
        estimated_weight_per_fish: "",
        total_estimated_weight: "",
      },
    };

    let isEnglish = true;

    for (const line of lines) {
      if (line.includes("Tên thông thường:")) {
        isEnglish = false;
        continue;
      }

      const [key, value] = line.split(":").map((part) => part.trim());
      if (!key || !value) continue;

      const lang = isEnglish ? "en" : "vi";

      switch (key) {
        case "Common Name":
        case "Tên thông thường":
          result[lang].common_name = value;
          break;
        case "Species":
          result[lang].species = value;
          break;
        case "Total Number of Fish":
        case "Tổng số cá":
          result[lang].total_number_of_fish = value;
          break;
        case "Average Fish Size":
        case "Kích thước cá trung bình":
          result[lang].average_fish_size = value;
          break;
        case "Estimated Weight per Fish":
        case "Khối lượng ước tính mỗi con":
          result[lang].estimated_weight_per_fish = value;
          break;
        case "Total Estimated Weight":
        case "Tổng khối lượng ước tính":
          result[lang].total_estimated_weight = value;
          break;
      }
    }

    // If Vietnamese values are missing, use English values
    Object.keys(result.en).forEach((key) => {
      if (!result.vi[key as keyof typeof result.vi]) {
        result.vi[key as keyof typeof result.vi] =
          result.en[key as keyof typeof result.en];
      }
    });

    return result;
  };

  // Analyze image function
  const analyzeImage = async (imageSrc: string) => {
    try {
      setIsScanning(true); // Start scanning effect
      
      // Fix blob creation from base64 image
      const base64Data = imageSrc.split(",")[1]; // Remove data URL prefix
      const contentType = imageSrc.split(";")[0].split(":")[1]; // e.g., "image/jpeg"

      // Create blob from base64
      const byteCharacters = atob(base64Data);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      const blob = new Blob(byteArrays, { type: contentType });

      const structuredResult: FishAnalysisResult = {
        success: true,
        processor: "gemini",
        analysis: {
          en: {
            common_name: "",
            species: "",
            total_number_of_fish: "",
            average_fish_size: "",
            estimated_weight_per_fish: "",
            total_estimated_weight: "",
          },
          vi: {
            common_name: "",
            species: "",
            total_number_of_fish: "",
            average_fish_size: "",
            estimated_weight_per_fish: "",
            total_estimated_weight: "",
          },
        },
        timestamp: new Date().toISOString(),
      };

      if (GOOGLE_API_KEY) {
        // Use Gemini for analysis
        const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
          ],
        });

        const prompt = `Please analyze this image and provide information about the fish in both English and Vietnamese. Include:
        - Common name
        - Species
        - Total Number of Fish
        - Average fish size (cm)
        - Estimated weight per fish (kg)
        - Total estimated weight (kg)

        Format the response exactly like this example:

        Common Name: Red Snapper
        Species: Lutjanus campechanus
        Total Number of Fish: 3
        Average Fish Size: 30
        Estimated Weight per Fish: 3
        Total Estimated Weight: 12
        -----------------------------
        Tên thông thường: Cá Hồng
        Species: Lutjanus campechanus
        Tổng số cá: 3
        Kích thước cá trung bình: 30
        Khối lượng ước tính mỗi con: 3
        Tổng khối lượng ước tính: 12

        And write more values if you can. Total Number of Fish need to count properly from the image. Write the response in Vietnamese and English if Vietnamese is not available then write english value for vietnamese. Format each line exactly as "Key: Value" and separate with newlines. Do not include any additional text or formatting.`;

        const imageData = {
          inlineData: {
            data: imageSrc.split(",")[1],
            mimeType: contentType,
          },
        };

        const geminiResult = await model.generateContent([prompt, imageData]);
        const geminiResponse = await geminiResult.response;
        const analysisText = geminiResponse.text();

        // Standardize the language data
        const standardizedData = standardizeLanguageData(analysisText);

        structuredResult.analysis = standardizedData;

        console.log("fullGeminiResult ", structuredResult);
        localStorage.setItem(
          "fishAnalysisResult",
          JSON.stringify(structuredResult)
        );
        setScannedData(structuredResult);

        // Check if no fish detected and show retake option
        if (!standardizedData.en.total_number_of_fish || standardizedData.en.total_number_of_fish === "0") {
          alert("No fish detected in the image. Please retake the photo.");
          setFishDetected(false);
          resetCapture();
          return;
        } else {
          setFishDetected(true);
        }
      }
    } catch (error) {
      console.error("Fish analysis error:", error);

      // Return error structure matching the expected format
      const errorResult = {
        success: false,
        error:
          error instanceof Error ? error.message : "Fish identification failed",
        fish_count: 0,
        detections: [],
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem("fishAnalysisResult", JSON.stringify(errorResult));
      return errorResult;
    } finally {
      setIsScanning(false); // Stop scanning effect
      setShowFishScan?.(false);
    }
  };

  // Take photo function
  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || isScanning) return;

    try {
      const imageSrc = cameraRef.current.takePhoto();
      setCapturedImage(imageSrc);
      
      // Store image in localStorage with key 'capturedFishImage'
      localStorage.setItem("capturedFishImage", imageSrc);
      
      onCapture?.(imageSrc);
      
      // Trigger scan analysis (this will handle isScanning state)
      await analyzeImage(imageSrc);
    } catch (error) {
      const errorMessage = "Failed to capture photo";
      setCameraError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false); // Ensure scanning stops on error
    }
  }, [isScanning, onCapture, onError]);

  // Switch camera function
  const switchCamera = useCallback(() => {
    if (availableCameras.length <= 1) return;

    const currentIndex = availableCameras.findIndex(
      (camera) => camera.deviceId === cameraSettings.selectedCamera
    );
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];

    setCameraSettings((prev) => ({
      ...prev,
      selectedCamera: nextCamera.deviceId,
    }));
  }, [availableCameras, cameraSettings.selectedCamera]);

  // Select from gallery
  const selectFromGallery = useCallback(() => {
    if (fileInputRef.current && !isScanning) {
      fileInputRef.current.click();
    }
  }, [isScanning]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageData = e.target?.result as string;
          setCapturedImage(imageData);
          
          // Store image in localStorage with key 'capturedFishImage'
          localStorage.setItem("capturedFishImage", imageData);
          
          onCapture?.(imageData);
          
          // Trigger scan analysis
          await analyzeImage(imageData);
        };
        reader.readAsDataURL(file);
      }
    },
    [onCapture]
  );

  // Reset capture
  const resetCapture = useCallback(() => {
    setCapturedImage(null);
    setFishDetected(false);
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Initializing camera...</span>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p className="text-lg font-semibold">Camera Error</p>
        <p className="text-sm">{cameraError}</p>
        <button
          onClick={initializeCameras}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Handle close with fish detection check
  const handleClose = () => {
    if (!fishDetected && capturedImage) {
      alert("Please scan a fish before closing or retake the photo if no fish was detected.");
      return;
    }
    setShowFishScan?.(false);
  };

  return (
    <div className="absolute h-full min-h-screen md:min-h-screen bg-black fixed top-0 left-0 right-0 bottom-0 z-50">
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 bg-white/20 backdrop-blur-sm rounded-full p-3 text-white hover:bg-white/30 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Scanning Effect Overlay */}
      {isScanning && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="relative">
              <div className="w-32 h-32 border-4 border-blue-500 rounded-lg animate-pulse mb-4 mx-auto">
                <div className="absolute inset-0 border-2 border-blue-300 rounded-lg animate-ping"></div>
                <div className="absolute inset-2 border border-blue-400 rounded-md animate-pulse"></div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-lg font-medium">Scanning Fish...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera View */}
      <div className="relative w-full h-full">
        {!capturedImage ? (
          <div className="w-full h-full">
            {cameraSettings.selectedCamera && (
              <Camera
                ref={cameraRef}
                key={`camera-${cameraSettings.selectedCamera}-${cameraSettings.facingMode}`}
                facingMode={cameraSettings.facingMode}
                aspectRatio="cover"
                videoSourceDeviceId={cameraSettings.selectedCamera}
                errorMessages={{
                  noCameraAccessible: "Please check camera permissions",
                  permissionDenied: "Camera permission denied",
                  switchCamera: "Cannot switch camera",
                  canvas: "Canvas not supported",
                }}
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center justify-center space-x-4">
          {/* Gallery Button */}
          <button
            onClick={selectFromGallery}
            disabled={isScanning}
            className="bg-gray-600 text-white w-10 h-10 rounded-full hover:bg-gray-700 transition-colors shadow-lg flex items-center justify-center text-sm disabled:opacity-50"
            title="Select from Gallery"
          >
            <FaImage />
          </button>

          {/* Capture Button */}
          {!capturedImage ? (
            <button
              onClick={takePhoto}
              disabled={isScanning}
              className="bg-white text-black w-14 h-14 rounded-full hover:bg-blue-600 transition-colors shadow-lg flex items-center justify-center text-xl border-4 border-white disabled:opacity-50"
              title="Capture Photo"
            >
              {isScanning ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <FaCamera className="w-6 h-6" />
              )}
            </button>
          ) : (
            <button
              onClick={resetCapture}
              className="bg-gray-600 text-white w-10 h-10 rounded-full hover:bg-gray-700 transition-colors shadow-lg flex items-center justify-center text-sm"
              title="Reset Capture"
            >
              <FaSync className="w-6 h-6" />
            </button>
          )}

          {/* Camera Switch Button */}
          {availableCameras.length > 1 && (
            <button
              onClick={switchCamera}
              disabled={isScanning}
              className="bg-gray-600 text-white w-10 h-10 rounded-full hover:bg-gray-700 transition-colors shadow-lg flex items-center justify-center text-sm disabled:opacity-50"
              title="Switch Camera"
            >
              <FaSync />
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            disabled={isScanning}
            className="bg-gray-600 text-white w-10 h-10 rounded-full hover:bg-gray-700 transition-colors shadow-lg flex items-center justify-center text-sm disabled:opacity-50"
            title="Camera Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Camera Settings Component */}
      <CameraSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={cameraSettings}
        onSettingChange={handleSettingChange}
        availableCameras={availableCameras}
      />
    </div>
  );
};

export default FishScanComponent;
