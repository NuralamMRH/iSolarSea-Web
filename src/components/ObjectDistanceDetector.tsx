import React, { useEffect, useRef } from "react";
import DeviceDetector from "device-detector-js";
import {
  FaceMesh,
  Results,
  FACEMESH_LEFT_IRIS,
  FACEMESH_RIGHT_IRIS,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
  FACEMESH_LEFT_EYE,
  FACEMESH_RIGHT_EYE,
  FACEMESH_TESSELATION,
} from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

interface ObjectDistanceDetectorProps {
  onDistanceUpdate?: (distance: number) => void;
  enabled: boolean;
  videoElement: HTMLVideoElement;
  cameraMode: string;
}

interface DetectedDevice {
  client: { name: string };
  os: { name: string };
}

const testSupport = (
  supportedDevices: { client?: string; os?: string }[]
): boolean => {
  const deviceDetector = new DeviceDetector();
  const detectedDevice = deviceDetector.parse(
    navigator.userAgent
  ) as DetectedDevice;

  let isSupported = false;
  for (const device of supportedDevices) {
    if (device.client !== undefined) {
      const re = new RegExp(`^${device.client}$`);
      if (!re.test(detectedDevice.client.name)) {
        continue;
      }
    }
    if (device.os !== undefined) {
      const re = new RegExp(`^${device.os}$`);
      if (!re.test(detectedDevice.os.name)) {
        continue;
      }
    }
    isSupported = true;
    break;
  }

  return isSupported;
};

export const ObjectDistanceDetector: React.FC<ObjectDistanceDetectorProps> = ({
  onDistanceUpdate,
  enabled,
  videoElement,
  cameraMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    if (!enabled || !videoElement || !canvasRef.current) return;

    const isDeviceSupported = testSupport([
      { client: "Chrome" },
      { client: "Firefox" },
      { client: "Safari" },
      { os: "iOS" },
      { os: "Android" },
    ]);

    if (!isDeviceSupported) {
      console.warn("Device may not be fully supported");
    }

    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d")!;

    // Initialize FaceMesh with improved settings
    faceMeshRef.current = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
      },
    });

    faceMeshRef.current.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      selfieMode: false, // Let the video element handle mirroring
    });

    const updateCanvasSize = () => {
      if (!canvasElement || !videoElement) return;

      // Get the video's actual dimensions
      const videoWidth = videoElement.videoWidth || videoElement.clientWidth;
      const videoHeight = videoElement.videoHeight || videoElement.clientHeight;

      // Get the container dimensions (parent element)
      const containerWidth = videoElement.clientWidth;
      const containerHeight = videoElement.clientHeight;

      // Calculate the scaling factor to maintain aspect ratio
      const scale = Math.min(
        containerWidth / videoWidth,
        containerHeight / videoHeight
      );

      // Set canvas dimensions to match the scaled video size
      canvasElement.width = videoWidth;
      canvasElement.height = videoHeight;

      // Update canvas style to match video dimensions
      canvasElement.style.width = `${containerWidth}px`;
      canvasElement.style.height = `${containerHeight}px`;

      // Apply transform based on camera mode
      canvasElement.style.transform =
        cameraMode === "user" ? "scaleX(-1)" : "none";

      return { width: videoWidth, height: videoHeight, scale };
    };

    faceMeshRef.current.onResults((results: Results) => {
      if (!canvasElement || !canvasCtx) return;

      const dimensions = updateCanvasSize();

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Draw face mesh with improved visibility
        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
          color: "rgba(255, 255, 255, 0.5)",
          lineWidth: 1,
        });

        drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {
          color: "#00FF00",
          lineWidth: 2,
        });

        drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {
          color: "#30FF30",
          lineWidth: 1,
        });
        drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {
          color: "#30FF30",
          lineWidth: 1,
        });

        drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, {
          color: "#FF3030",
          lineWidth: 2,
        });
        drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, {
          color: "#FF3030",
          lineWidth: 2,
        });

        // Calculate distance using both irises for better accuracy
        const leftIrisPoints = FACEMESH_LEFT_IRIS.flat();
        const rightIrisPoints = FACEMESH_RIGHT_IRIS.flat();

        let leftMinX = Number.MAX_VALUE;
        let leftMaxX = Number.MIN_VALUE;
        let rightMinX = Number.MAX_VALUE;
        let rightMaxX = Number.MIN_VALUE;

        // Calculate left iris width
        for (const point of leftIrisPoints) {
          const x = landmarks[point].x * canvasElement.width;
          leftMinX = Math.min(leftMinX, x);
          leftMaxX = Math.max(leftMaxX, x);
        }

        // Calculate right iris width
        for (const point of rightIrisPoints) {
          const x = landmarks[point].x * canvasElement.width;
          rightMinX = Math.min(rightMinX, x);
          rightMaxX = Math.max(rightMaxX, x);
        }

        const leftIrisWidth = leftMaxX - leftMinX;
        const rightIrisWidth = rightMaxX - rightMinX;

        // Use average of both irises
        const avgIrisWidthPixels = (leftIrisWidth + rightIrisWidth) / 2;

        // Constants for distance calculation
        const KNOWN_IRIS_WIDTH_MM = 11.7; // Average human iris width
        const FOCAL_LENGTH_FACTOR = 1.2; // Adjusted focal length factor

        const focalLength =
          (canvasElement.width * FOCAL_LENGTH_FACTOR) / Math.tan(Math.PI / 3);
        const distanceMM =
          (KNOWN_IRIS_WIDTH_MM * focalLength) / avgIrisWidthPixels;
        const distanceCM = distanceMM / 10;

        if (onDistanceUpdate && !isNaN(distanceCM) && distanceCM > 0) {
          onDistanceUpdate(distanceCM);
        }
      }

      canvasCtx.restore();
    });

    // Initialize Camera
    if (!cameraRef.current) {
      cameraRef.current = new Camera(videoElement, {
        onFrame: async () => {
          if (faceMeshRef.current) {
            try {
              await faceMeshRef.current.send({ image: videoElement });
            } catch (error) {
              console.error("Error in face detection:", error);
            }
          }
        },
        width: 720,
        height: 1280,
      });

      cameraRef.current.start().catch((error) => {
        console.error("Error starting camera:", error);
      });
    }

    // Add resize observer to handle size changes
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(videoElement);

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
      resizeObserver.disconnect();
    };
  }, [enabled, videoElement, onDistanceUpdate, cameraMode]); // Add cameraMode to dependencies

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 20,
        mixBlendMode: "screen",
        objectFit: "cover",
      }}
    />
  );
};

export default ObjectDistanceDetector;
