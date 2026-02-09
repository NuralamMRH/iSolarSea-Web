import React, { useRef, useEffect, useState, useCallback } from "react";
import { Fish, Check, AlertCircle, Info } from "lucide-react";

interface FishAnalysisData {
  success: boolean;
  fish_count: number;
  detections: Array<{
    classification?: {
      accuracy: number;
      common_name: string;
      scientific_name: string;
      species: string;
      species_id: string;
    };
    detection: {
      bounding_box: number[];
      confidence: number;
      detected_class: string;
      model: string;
    };
    fish_id: number;
    metrics: {
      dimensions: {
        area_pixels: number;
        height_pixels: number;
        width_pixels: number;
      };
      position: {
        center_x: number;
        center_y: number;
        relative_center_x: number;
        relative_center_y: number;
      };
      relative_size: {
        area_ratio: number;
        height_ratio: number;
        width_ratio: number;
      };
      size_category: string;
    };
    polygon: number[][];
    processing_time_ms: number;
    distance_analysis?: {
      estimated_weight_kg: number;
      distance_cm: number;
      real_length_cm: number;
      real_girth_cm: number;
      distance_confidence: number;
      calculation_method: string;
      formulas_used: string[];
    };
  }>;
  models_used?: {
    classification: string;
    detection: string;
  };
}

interface FishInfo {
  id: number;
  name?: string;
  scientific_name?: string;
  species?: string;
  distance?: number;
  confidence?: number;
  accuracy?: number;
  timestamp?: number;
  detected_class?: string;
  detectionCount?: number;
  bounding_box?: number[];
  polygon?: number[][];
  size_category?: string;
  metrics?: {
    dimensions: {
      area_pixels: number;
      height_pixels: number;
      width_pixels: number;
    };
    position: {
      center_x: number;
      center_y: number;
      relative_center_x: number;
      relative_center_y: number;
    };
    relative_size: {
      area_ratio: number;
      height_ratio: number;
      width_ratio: number;
    };
  };
  distance_analysis?: {
    estimated_weight_kg: number;
    distance_cm: number;
    real_length_cm: number;
    real_girth_cm: number;
    distance_confidence: number;
    calculation_method: string;
    formulas_used: string[];
  };
  model?: string;
  processing_time_ms?: number;
}

interface FishDetectionAndAnalysisProps {
  enabled?: boolean;
  showOverlay?: boolean;
  videoElement: HTMLVideoElement;
  cameraMode: string;
  onFishDetected?: (fishInfo: FishInfo[]) => void;
  onDistanceUpdate?: (distance: number) => void;
}

const MIN_CONFIDENCE_THRESHOLD = 0.65;
const MIN_DETECTIONS_REQUIRED = 3;
const ANALYSIS_INTERVAL = 500;

// Constants for fish-based distance calculation
const FOCAL_LENGTH_FACTOR = 1.2;
const AVERAGE_FISH_SIZES = {
  SMALL: { width: 15, length: 25 }, // cm
  MEDIUM: { width: 25, length: 40 }, // cm
  LARGE: { width: 35, length: 60 }, // cm
};

interface DistanceCalibration {
  focalLength: number;
  referenceDistance: number;
  referencePixels: number;
}

const FishDetectionAndAnalysis: React.FC<FishDetectionAndAnalysisProps> = ({
  enabled = true,
  showOverlay = true,
  videoElement,
  cameraMode,
  onFishDetected,
  onDistanceUpdate,
}) => {
  const [fishInfos, setFishInfos] = useState<FishInfo[]>([]);
  const [displayInfos, setDisplayInfos] = useState<FishInfo[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stabilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [calibration, setCalibration] = useState<DistanceCalibration | null>(
    null
  );

  // Initialize camera calibration
  useEffect(() => {
    if (!videoElement) return;

    const focalLength =
      (videoElement.videoWidth * FOCAL_LENGTH_FACTOR) / Math.tan(Math.PI / 3);
    setCalibration({
      focalLength,
      referenceDistance: 100, // 100cm reference distance
      referencePixels: videoElement.videoWidth / 2,
    });
  }, [videoElement]);

  const drawDetections = useCallback(
    (detections: FishInfo[]) => {
      if (!overlayCanvasRef.current || !videoElement) return;

      const ctx = overlayCanvasRef.current.getContext("2d");
      if (!ctx) return;

      overlayCanvasRef.current.width = videoElement.videoWidth;
      overlayCanvasRef.current.height = videoElement.videoHeight;
      videoElement.style.transform = "none";
      videoElement.style.width = "100%";
      videoElement.style.height = "100%";
      videoElement.style.objectFit = "cover";
      videoElement.style.position = "absolute";
      videoElement.style.top = "0";
      videoElement.style.left = "0";
      videoElement.style.right = "0";
      videoElement.style.bottom = "0";

      ctx.clearRect(
        0,
        0,
        overlayCanvasRef.current.width,
        overlayCanvasRef.current.height
      );

      detections.forEach((fish) => {
        if (!fish.bounding_box) return;

        const [x, y, x2, y2] = fish.bounding_box;
        const width = x2 - x;
        const height = y2 - y;

        // // Draw bounding box (DISABLED)
        // ctx.strokeStyle = "#00ff00";
        // ctx.lineWidth = 2;
        // ctx.strokeRect(x, y, width, height);

        // // Draw polygon if available (DISABLED)
        // if (fish.polygon) {
        //   ctx.beginPath();
        //   ctx.strokeStyle = "#ffff00";
        //   ctx.lineWidth = 1;
        //   fish.polygon.forEach((point, index) => {
        //     if (index === 0) {
        //       ctx.moveTo(point[0], point[1]);
        //     } else {
        //       ctx.lineTo(point[0], point[1]);
        //     }
        //   });
        //   ctx.closePath();
        //   ctx.stroke();
        // }

        // Draw labels
        const labels = [
          `${fish.name || fish.detected_class} (${(
            fish.confidence! * 100
          ).toFixed(1)}%)`,
          fish.size_category ? `Size: ${fish.size_category}` : "",
          fish.distance_analysis
            ? `Length: ${fish.distance_analysis.real_length_cm.toFixed(1)}cm`
            : "",
          fish.distance_analysis
            ? `Distance: ${fish.distance_analysis.distance_cm.toFixed(1)}cm`
            : "",
        ].filter(Boolean);

        // Draw label background and text
        ctx.font = "16px Arial";
        let yOffset = y - 25;

        labels.forEach((label) => {
          const labelWidth = ctx.measureText(label).width + 10;
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(x, yOffset, labelWidth, 25);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, x + 5, yOffset + 18);
          yOffset -= 25;
        });
      });
    },
    [videoElement]
  );

  // Calculate fish distance using size-based estimation
  const calculateFishDistance = (
    fishWidth: number,
    sizeCategory: string
  ): number => {
    if (!calibration) return 0;

    // Get reference fish size based on category
    const refSize =
      AVERAGE_FISH_SIZES[sizeCategory as keyof typeof AVERAGE_FISH_SIZES] ||
      AVERAGE_FISH_SIZES.MEDIUM;

    // Use similar triangles principle with the reference fish width
    // (Known Width in cm * Focal Length) / Pixel Width = Distance in cm
    const distance = (refSize.width * calibration.focalLength) / fishWidth;

    // Apply confidence-based adjustment
    return Math.max(10, Math.min(300, distance)); // Limit distance between 10cm and 300cm
  };

  const analyzeCurrentFrame = useCallback(async () => {
    if (!canvasRef.current || !videoElement) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    canvasRef.current.width = videoElement.videoWidth;
    canvasRef.current.height = videoElement.videoHeight;
    videoElement.style.width = "100%";
    videoElement.style.height = "100%";
    videoElement.style.objectFit = "cover";
    videoElement.style.position = "absolute";
    videoElement.style.top = "0";
    videoElement.style.left = "0";
    videoElement.style.right = "0";
    videoElement.style.bottom = "0";
    ctx.drawImage(videoElement, 0, 0);

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current?.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
      });

      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");

      const response = await fetch("https://fishai.itrucksea.com/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result: FishAnalysisData = await response.json();

      if (result.success && result.detections?.length > 0) {
        const newFishInfos = result.detections.map((detection) => {
          // Calculate fish width from bounding box
          const [x1, y1, x2, y2] = detection.detection.bounding_box;
          const fishWidth = Math.abs(x2 - x1);
          const fishHeight = Math.abs(y2 - y1);

          // Calculate distance based on fish size category
          const calculatedDistance = calculateFishDistance(
            fishWidth,
            detection.metrics.size_category
          );

          // Calculate real dimensions using the distance
          const realLength =
            (fishHeight * calculatedDistance) / calibration!.focalLength;
          const realWidth =
            (fishWidth * calculatedDistance) / calibration!.focalLength;

          // Update parent component with calculated distance
          if (calculatedDistance && onDistanceUpdate) {
            onDistanceUpdate(calculatedDistance);
          }

          return {
            id: detection.fish_id,
            name: detection.classification?.common_name,
            scientific_name: detection.classification?.scientific_name,
            species: detection.classification?.species,
            detected_class: detection.detection.detected_class,
            confidence: detection.detection.confidence,
            accuracy: detection.classification?.accuracy,
            bounding_box: detection.detection.bounding_box,
            polygon: detection.polygon,
            size_category: detection.metrics.size_category,
            metrics: detection.metrics,
            distance_analysis: {
              distance_cm: calculatedDistance,
              real_length_cm: realLength,
              real_girth_cm: realWidth * 2, // Approximate girth as 2x width
              estimated_weight_kg:
                (realLength * Math.pow(realWidth * 2, 2)) / 800, // Simple weight formula
              distance_confidence: detection.detection.confidence,
              calculation_method: "size_based_estimation",
              formulas_used: ["(length × girth × girth) / 800"],
            },
            model: detection.detection.model,
            processing_time_ms: detection.processing_time_ms,
            timestamp: Date.now(),
            detectionCount: 1,
          };
        });

        updateFishInfos(newFishInfos);
      } else {
        // Reset distance when no fish detected
        if (onDistanceUpdate) {
          onDistanceUpdate(0);
        }
      }
    } catch (error) {
      console.error("Frame analysis error:", error);
      // Reset distance on error
      if (onDistanceUpdate) {
        onDistanceUpdate(0);
      }
    }
  }, [videoElement, calibration, onDistanceUpdate]);

  useEffect(() => {
    if (!enabled) return;

    const startAnalysis = () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }

      const analyze = () => {
        analyzeCurrentFrame();
        analysisTimeoutRef.current = setTimeout(analyze, ANALYSIS_INTERVAL);
      };

      analyze();
    };

    startAnalysis();

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [enabled, analyzeCurrentFrame]);

  const isSignificantChange = (
    current: FishInfo[],
    next: FishInfo[]
  ): boolean => {
    if (
      next.some((fish) => (fish.confidence || 0) < MIN_CONFIDENCE_THRESHOLD)
    ) {
      return false;
    }
    return next.length > 0;
  };

  const updateFishInfos = useCallback(
    (newInfos: FishInfo[]) => {
      const now = Date.now();

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      if (stabilityTimeoutRef.current) {
        clearTimeout(stabilityTimeoutRef.current);
        stabilityTimeoutRef.current = null;
      }

      const validDetections = newInfos.filter(
        (fish) => fish.confidence && fish.confidence >= MIN_CONFIDENCE_THRESHOLD
      );

      if (
        validDetections.length > 0 &&
        isSignificantChange(fishInfos, validDetections)
      ) {
        setFishInfos(validDetections);
        lastUpdateRef.current = now;

        updateTimeoutRef.current = setTimeout(() => {
          setDisplayInfos(validDetections);
          drawDetections(validDetections);

          if (onFishDetected) {
            onFishDetected(validDetections);
          }

          stabilityTimeoutRef.current = setTimeout(() => {
            lastUpdateRef.current = Date.now() - 500;
          }, 10000);
        }, 2000);
      }
    },
    [fishInfos, onFishDetected, drawDetections]
  );

  return (
    <>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          zIndex: 20,
          transform: cameraMode === "user" ? "scaleX(-1)" : "none",
        }}
      />
      {showOverlay && displayInfos.length > 0 && (
        <div
          className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg transition-all duration-300 ease-in-out max-w-sm"
          style={{ zIndex: 30 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Fish className="w-5 h-5" />
            <h3 className="text-lg font-bold">
              Detected Fish ({displayInfos.length})
            </h3>
          </div>

          {displayInfos.map((fish) => (
            <div
              key={fish.id}
              className="mb-4 last:mb-0 border-t border-gray-600 pt-2"
            >
              <div className="flex items-center gap-2">
                <h4 className="font-bold capitalize">
                  {fish.name || fish.detected_class}
                </h4>
                {fish.confidence && fish.confidence >= 0.8 && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
              </div>

              {fish.scientific_name && (
                <p className="text-sm text-gray-300 italic mb-1">
                  {fish.scientific_name}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                {fish.confidence && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-300">Confidence:</span>
                    <span className={getConfidenceColor(fish.confidence)}>
                      {(fish.confidence * 100).toFixed(1)}% (
                      {getConfidenceLabel(fish.confidence)})
                    </span>
                  </div>
                )}

                {fish.size_category && (
                  <div>
                    <span className="text-gray-300">Size:</span>{" "}
                    <span className="text-blue-400">{fish.size_category}</span>
                  </div>
                )}

                {fish.distance_analysis && (
                  <>
                    <div>
                      <span className="text-gray-300">Length:</span>{" "}
                      <span className="text-green-400">
                        {fish.distance_analysis.real_length_cm.toFixed(1)} cm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300">Weight:</span>{" "}
                      <span className="text-yellow-400">
                        {fish.distance_analysis.estimated_weight_kg.toFixed(2)}{" "}
                        kg
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300">Distance:</span>{" "}
                      <span className="text-blue-400">
                        {fish.distance_analysis.distance_cm.toFixed(1)} cm
                      </span>
                    </div>
                  </>
                )}
              </div>

              {fish.metrics && (
                <div className="mt-2 text-xs grid grid-cols-2 gap-1">
                  <div>
                    <span className="text-gray-300">Area Ratio:</span>{" "}
                    <span className="text-gray-400">
                      {(fish.metrics.relative_size.area_ratio * 100).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">Processing:</span>{" "}
                    <span className="text-gray-400">
                      {(fish.processing_time_ms! / 1000).toFixed(2)}s
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-600";
  if (confidence >= 0.6) return "text-yellow-600";
  return "text-red-600";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "Very High";
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.6) return "Medium";
  if (confidence >= 0.4) return "Low";
  return "Very Low";
}

export default FishDetectionAndAnalysis;
