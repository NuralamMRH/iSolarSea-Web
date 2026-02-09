import React, { useRef, useEffect, useState, useCallback } from "react";
import { fishDistanceUtils } from "../utils/fishDistanceDetection";
import { Camera, Zap, Download } from "lucide-react";

// Import the correct type from the utility file
type FishAnalysisData = Parameters<
  typeof fishDistanceUtils.enhanceDetectionWithDistance
>[1];

interface FishMediaPipeDetectorProps {
  onDistanceUpdate?: (distance: number, length: number, weight: number) => void;
  onLandmarksDetected?: (
    landmarks: Array<{ x: number; y: number; z: number }>
  ) => void;
  onFishDetected?: (
    capturedImage: string,
    analysisData: FishAnalysisData
  ) => void;
  enabled?: boolean;
  showOverlay?: boolean;
  autoCapture?: boolean;
}

interface DetectedFishInfo {
  distance: number;
  length: number;
  girth: number;
  weight: number;
  confidence: number;
  polygon?: number[][];
}

interface LiveDetection {
  polygon: number[][];
  confidence: number;
  distance?: number;
  boundingBox?: number[];
}

// Interface for detection with distance analysis
interface EnhancedDetection {
  polygon?: number[][];
  distance_analysis?: {
    distance_cm: number;
    real_length_cm: number;
    real_girth_cm: number;
    estimated_weight_kg: number;
    distance_confidence: number;
  };
}

const FishMediaPipeDetector: React.FC<FishMediaPipeDetectorProps> = ({
  onDistanceUpdate,
  onLandmarksDetected,
  onFishDetected,
  enabled = true,
  showOverlay = true,
  autoCapture = true,
}) => {
  // Function to check if camera API is available
  const isCameraAPIAvailable = () => {
    return !!(
      navigator &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  };

  // Function to get user media with error handling
  const getUserMediaSafely = async (constraints: MediaStreamConstraints) => {
    if (!isCameraAPIAvailable()) {
      throw new Error("Camera API not available. Please ensure you're using HTTPS and camera permissions are enabled.");
    }
    
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error("getUserMedia error:", error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error("Camera access denied. Please enable camera permissions and ensure you're using HTTPS.");
        } else if (error.name === 'NotFoundError') {
          throw new Error("No camera found. Please connect a camera device.");
        } else if (error.name === 'NotReadableError') {
          throw new Error("Camera is already in use by another application.");
        }
      }
      throw error;
    }
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [detectedFish, setDetectedFish] = useState<DetectedFishInfo | null>(
    null
  );
  const [liveDetection, setLiveDetection] = useState<LiveDetection | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<FishAnalysisData | null>(
    null
  );
  const [fishDetected, setFishDetected] = useState(false);
  const [autoCaptureCooldown, setAutoCaptureCooldown] = useState(false);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const detectFishFeatures = async (canvas: HTMLCanvasElement) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      // Convert canvas to blob for analysis
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.8);
      });

      // Create FormData for fish detection API
      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");

      // Call fish detection API
      const response = await fetch("http://localhost:5004/analyze", {
        method: "POST",
        body: formData,
      });

      const result: FishAnalysisData = await response.json();

      if (result.success && result.detections && result.detections.length > 0) {
        const detection = result.detections[0];

        // Update live detection
        setLiveDetection({
          polygon: detection.polygon || [],
          confidence: detection.detection.confidence,
          boundingBox: detection.detection.bounding_box,
        });

        // Set fish detected flag
        setFishDetected(true);

        // Auto-capture if enabled and not in cooldown
        if (
          autoCapture &&
          !autoCaptureCooldown &&
          detection.detection.confidence > 0.7
        ) {
          await handleAutoCapture(canvas, result);
        }

        // Create image element for distance processing
        const img = new Image();
        img.onload = async () => {
          try {
            // Enhance with distance detection
            const enhanced =
              await fishDistanceUtils.enhanceDetectionWithDistance(
                img,
                result,
                "mobile"
              );

            if (enhanced.detections[0]?.distance_analysis) {
              const analysis = enhanced.detections[0].distance_analysis;
              const fishInfo: DetectedFishInfo = {
                distance: analysis.distance_cm,
                length: analysis.real_length_cm,
                girth: analysis.real_girth_cm,
                weight: analysis.estimated_weight_kg,
                confidence: analysis.distance_confidence,
                polygon: detection.polygon,
              };

              setDetectedFish(fishInfo);

              // Update live detection with distance
              setLiveDetection((prev) =>
                prev
                  ? {
                      ...prev,
                      distance: analysis.distance_cm,
                    }
                  : null
              );

              // Trigger callbacks
              if (onDistanceUpdate) {
                onDistanceUpdate(
                  fishInfo.distance,
                  fishInfo.length,
                  fishInfo.weight
                );
              }

              // Extract landmarks for callback
              if (onLandmarksDetected && enhanced.detections[0]?.polygon) {
                const polygon = enhanced.detections[0].polygon;
                const landmarks = extractLandmarksFromPolygon(
                  polygon,
                  img.width,
                  img.height
                );
                onLandmarksDetected(landmarks);
              }
            }
          } catch (error) {
            console.error("Distance enhancement error:", error);
          }
        };

        img.src = canvas.toDataURL();
      } else {
        // No fish detected
        setFishDetected(false);
        setLiveDetection(null);
        setDetectedFish(null);
      }
    } catch (error) {
      console.error("Fish detection error:", error);
      setFishDetected(false);
      setLiveDetection(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoCapture = async (
    canvas: HTMLCanvasElement,
    detectionResult: FishAnalysisData
  ) => {
    try {
      // Set cooldown to prevent multiple captures
      setAutoCaptureCooldown(true);
      setTimeout(() => setAutoCaptureCooldown(false), 3000); // 3 second cooldown

      // Capture the current frame
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(imageDataUrl);
      setAnalysisData(detectionResult);

      // Trigger callback
      if (onFishDetected) {
        onFishDetected(imageDataUrl, detectionResult);
      }

      console.log(
        "Auto-captured fish image with confidence:",
        detectionResult.detections[0].detection.confidence
      );
    } catch (error) {
      console.error("Auto-capture error:", error);
    }
  };

  const handleManualAnalyze = async () => {
    if (!capturedImage || !analysisData) return;

    try {
      // Store the captured image and analysis data
      localStorage.setItem("myPhoto", capturedImage);

      // Create image element for distance processing
      const img = new Image();
      img.onload = async () => {
        try {
          // Process with distance detection enhancement
          const enhanced = await fishDistanceUtils.enhanceDetectionWithDistance(
            img,
            analysisData,
            "mobile"
          );

          console.log("Enhanced fish result with distance:", enhanced);

          // Store the enhanced analysis result
          localStorage.setItem("fishAnalysisResult", JSON.stringify(enhanced));

          // Navigate to result page (you might want to emit an event instead)
          window.dispatchEvent(new CustomEvent("navigateToResults"));
        } catch (error) {
          console.error("Analysis enhancement failed:", error);
          // Fall back to original result
          localStorage.setItem(
            "fishAnalysisResult",
            JSON.stringify(analysisData)
          );
          window.dispatchEvent(new CustomEvent("navigateToResults"));
        }
      };

      img.src = capturedImage;
    } catch (error) {
      console.error("Manual analyze error:", error);
    }
  };

  const startDetection = useCallback(() => {
    const processFrame = async () => {
      if (!videoRef.current || !canvasRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw live polygon if detected
      if (liveDetection && showOverlay) {
        drawLiveOverlay(ctx, liveDetection, canvas.width, canvas.height);
      }

      // Process every 5th frame for better responsiveness
      if (Math.random() < 0.2) {
        await detectFishFeatures(canvas);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
  }, [liveDetection, showOverlay]);

  useEffect(() => {
    if (!enabled) return;

    // Initialize camera stream
    const initializeCamera = async () => {
      try {
        const stream = await getUserMediaSafely({
          video: {
            facingMode: "environment", // Use back camera for fish detection
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadedmetadata", () => {
            setIsInitialized(true);
            startDetection();
          });
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    initializeCamera();

    return () => {
      // Cleanup
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, startDetection]);

  const extractLandmarksFromPolygon = (
    polygon: number[][],
    width: number,
    height: number
  ) => {
    const landmarks = [];

    // Find extreme points as landmarks
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const point of polygon) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    }

    // Create landmarks from extreme points (normalized coordinates)
    landmarks.push(
      { x: minX / width, y: (minY + maxY) / 2 / height, z: 0 }, // Left-most point
      { x: maxX / width, y: (minY + maxY) / 2 / height, z: 0 }, // Right-most point
      { x: (minX + maxX) / 2 / width, y: minY / height, z: 0 }, // Top-most point
      { x: (minX + maxX) / 2 / width, y: maxY / height, z: 0 } // Bottom-most point
    );

    return landmarks;
  };

  const drawLiveOverlay = (
    ctx: CanvasRenderingContext2D,
    detection: LiveDetection,
    width: number,
    height: number
  ) => {
    // Draw fish polygon
    if (detection.polygon && detection.polygon.length > 0) {
      ctx.strokeStyle = fishDetected ? "#00ff00" : "#ffff00"; // Green if detected, yellow if tracking
      ctx.lineWidth = 3;
      ctx.beginPath();

      const firstPoint = detection.polygon[0];
      ctx.moveTo(firstPoint[0], firstPoint[1]);

      for (let i = 1; i < detection.polygon.length; i++) {
        const point = detection.polygon[i];
        ctx.lineTo(point[0], point[1]);
      }

      ctx.closePath();
      ctx.stroke();

      // Draw bounding box
      if (detection.boundingBox) {
        const [x, y, w, h] = detection.boundingBox;
        ctx.strokeStyle = fishDetected ? "#00ff00" : "#ffaa00";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
      }
    }

    // Draw live distance information
    if (detection.distance || detectedFish) {
      const distance = detection.distance || detectedFish?.distance || 0;
      const confidence = detection.confidence || 0;

      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(10, 10, 280, 100);

      ctx.fillStyle = "#fff";
      ctx.font = "14px Arial";
      ctx.fillText(`🎣 Live Fish Detection`, 20, 30);

      if (distance > 0) {
        ctx.fillText(`📏 Distance: ${distance.toFixed(1)} cm`, 20, 50);
      }

      ctx.fillText(`🎯 Confidence: ${(confidence * 100).toFixed(0)}%`, 20, 70);

      if (fishDetected) {
        ctx.fillStyle = "#00ff00";
        ctx.fillText(`✅ Fish Detected!`, 20, 90);
      } else {
        ctx.fillStyle = "#ffaa00";
        ctx.fillText(`🔍 Scanning...`, 20, 90);
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Video element (hidden, used for processing) */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* Canvas for overlay display */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ display: showOverlay ? "block" : "none" }}
      />

      {/* Live Detection Status */}
      {enabled && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-sm max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isInitialized ? "bg-green-500" : "bg-red-500"
              } animate-pulse`}
            />
            <span className="font-medium">
              {isInitialized ? "Live Detection" : "Initializing..."}
            </span>
          </div>

          {fishDetected && (
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="flex items-center gap-1 text-green-400 mb-1">
                <Zap className="w-3 h-3" />
                <span className="text-xs font-medium">Fish Detected!</span>
              </div>
              {detectedFish && (
                <div className="space-y-1 text-xs">
                  <div>Distance: {detectedFish.distance.toFixed(1)} cm</div>
                  <div>Length: {detectedFish.length.toFixed(1)} cm</div>
                  <div>Weight: {detectedFish.weight.toFixed(2)} kg</div>
                  <div>
                    Confidence: {(detectedFish.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              )}
            </div>
          )}

          {liveDetection && !fishDetected && (
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="text-yellow-400 text-xs">
                <div>Tracking object...</div>
                <div>
                  Confidence: {(liveDetection.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="text-xs text-blue-400 mt-2 flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              Processing...
            </div>
          )}
        </div>
      )}

      {/* Auto-captured Image Preview */}
      {capturedImage && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 rounded-lg p-3 text-white">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured fish"
                className="w-16 h-16 object-cover rounded border-2 border-green-500"
              />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <Camera className="w-2 h-2 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-green-400 mb-1">
                Auto-captured!
              </div>
              <button
                onClick={handleManualAnalyze}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded flex items-center gap-1 transition-colors"
              >
                <Download className="w-3 h-3" />
                Analyze Fish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-capture indicator */}
      {autoCaptureCooldown && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium animate-pulse">
          📸 Auto-capturing...
        </div>
      )}
    </div>
  );
};

export default FishMediaPipeDetector;
