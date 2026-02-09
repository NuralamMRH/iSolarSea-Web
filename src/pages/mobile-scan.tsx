import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera } from "react-camera-pro";
import { useNavigate } from "react-router-dom";
import { FaCamera, FaImage, FaSync } from "react-icons/fa";
import {
  Scan,
  Loader2,
  Menu,
  Info,
  BackpackIcon,
  ArrowLeft,
} from "lucide-react";
import CameraSettings from "../components/ui/CameraSettings";
import FishDetectionAndAnalysis from "../components/FishDetectionAndAnalysis";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { GOOGLE_API_KEY } from "@/lib/constants";

export default function MobileScan() {
  // Function to check if camera API is available
  const isCameraAPIAvailable = () => {
    return !!(
      navigator &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      navigator.mediaDevices.enumerateDevices
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

  // Function to enumerate devices with error handling
  const enumerateDevicesSafely = async () => {
    if (!isCameraAPIAvailable()) {
      throw new Error("Camera API not available. Please ensure you're using HTTPS and camera permissions are enabled.");
    }
    
    try {
      return await navigator.mediaDevices.enumerateDevices();
    } catch (error) {
      console.error("enumerateDevices error:", error);
      throw new Error("Failed to enumerate camera devices. Please check camera permissions.");
    }
  };

  const navigate = useNavigate();
  const camera = useRef<{ takePhoto: () => string } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraMode, setCameraMode] = useState<"user" | "environment">(
    "environment"
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [objectDistance, setObjectDistance] = useState<number | null>(null);

  // New state for camera settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Add state to track stream initialization
  const [isStreamReady, setIsStreamReady] = useState(false);
  const streamInitAttempts = useRef(0);
  const maxStreamAttempts = 30;

  interface StoredCamera {
    deviceId: string;
    groupId: string;
    kind: MediaDeviceKind;
    label: string;
  }

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    () => {
      // Initialize from localStorage if available
      const storedCameras = localStorage.getItem("availableCameras");
      if (storedCameras) {
        try {
          // Parse stored cameras and convert to MediaDeviceInfo-like objects
          return JSON.parse(storedCameras).map((camera: StoredCamera) => ({
            deviceId: camera.deviceId,
            groupId: camera.groupId,
            kind: camera.kind,
            label: camera.label,
          }));
        } catch (error) {
          console.error("Error parsing stored cameras:", error);
          return [];
        }
      }
      return [];
    }
  );

  // Effect to check mobile device and set initial camera mode
  useEffect(() => {
    const checkMobile = () => {
      const mobile = checkIsMobile();
      setIsMobile(mobile);
      // Only set environment mode for mobile devices
      setCameraMode(mobile ? "environment" : "user");
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Effect to initialize camera on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;

      try {
        setIsInitializing(true);

        // First get stored settings before anything else
        const storedSettings = localStorage.getItem("cameraSettings");
        console.log("Initial stored settings:", storedSettings);

        // Get permissions and cameras
        try {
          const stream = await getUserMediaSafely({
            video: true,
          });
          stream.getTracks().forEach((track) => track.stop());

          const devices = await enumerateDevicesSafely();
          const cameras = devices.filter(
            (device) => device.kind === "videoinput"
          );
          console.log("Available cameras:", cameras);

          // Store cameras in localStorage and state
          const camerasToStore = cameras.map((camera) => ({
            deviceId: camera.deviceId,
            groupId: camera.groupId,
            kind: camera.kind,
            label: camera.label,
          }));
          localStorage.setItem(
            "availableCameras",
            JSON.stringify(camerasToStore)
          );
          setAvailableCameras(cameras);

          let settings;
          if (storedSettings) {
            try {
              settings = JSON.parse(storedSettings);
              // Verify the stored camera exists
              const storedCamera = cameras.find(
                (camera) => camera.deviceId === settings.selectedCamera
              );

              if (!storedCamera) {
                // If stored camera not found, try to find external camera first
                const externalCamera = cameras.find(
                  (camera) => !isDefaultCamera(camera)
                );
                settings = {
                  selectedCamera:
                    externalCamera?.deviceId || cameras[0]?.deviceId,
                  isMaskEnabled: true,
                  isLiveDetectionEnabled: true,
                };
              }
            } catch (error) {
              console.error("Error parsing stored settings:", error);
              const externalCamera = cameras.find(
                (camera) => !isDefaultCamera(camera)
              );
              settings = {
                selectedCamera:
                  externalCamera?.deviceId || cameras[0]?.deviceId,
                isMaskEnabled: true,
                isLiveDetectionEnabled: true,
              };
            }
          } else {
            // If no stored settings, prefer external camera
            const externalCamera = cameras.find(
              (camera) => !isDefaultCamera(camera)
            );
            settings = {
              selectedCamera: externalCamera?.deviceId || cameras[0]?.deviceId,
              isMaskEnabled: true,
              isLiveDetectionEnabled: true,
            };
          }

          console.log("Initializing with settings:", settings);
          setCameraSettings(settings);
          localStorage.setItem("cameraSettings", JSON.stringify(settings));

          if (settings.selectedCamera) {
            const selectedDevice = cameras.find(
              (camera) => camera.deviceId === settings.selectedCamera
            );
            if (selectedDevice) {
              const isExternal = !isDefaultCamera(selectedDevice);
              console.log("Selected camera is external:", isExternal);

              // Update mode based on device type
              setCameraMode("environment");

              await setupVideoStream(settings.selectedCamera);
            }
          }
        } catch (permError) {
          console.error("Failed to get camera permissions:", permError);
          setCameraError(true);
        }
      } catch (error) {
        console.error("Camera initialization failed:", error);
        setCameraError(true);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      stopAllMediaStreams();
    };
  }, []); // Run only once on mount

  // Update the initial state to include stored settings
  const [cameraSettings, setCameraSettings] = useState(() => {
    const storedSettings = localStorage.getItem("cameraSettings");
    if (storedSettings) {
      return JSON.parse(storedSettings);
    }
    return {
      selectedCamera: "",
      isMaskEnabled: true,
      isLiveDetectionEnabled: true,
    };
  });

  console.log("cameraSettings", cameraSettings);

  // New state for captured image and distance
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [lastCapturedDistance, setLastCapturedDistance] = useState<
    number | null
  >(null);

  // Function to check if camera is default built-in camera
  const isDefaultCamera = (camera: MediaDeviceInfo) => {
    try {
      const label = camera.label.toLowerCase();
      // More specific check for built-in cameras
      return (
        label.includes("facetime hd") ||
        label.includes("built-in") ||
        label.includes("integrated") ||
        label.includes("internal")
      );
    } catch (error) {
      console.error("Error checking default camera:", error);
      return false;
    }
  };

  // Function to check if device is mobile
  const checkIsMobile = () => {
    return (
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 600
    );
  };

  // Function to stop all media streams
  const stopAllMediaStreams = async () => {
    try {
      // Stop all active media streams
      const devices = await enumerateDevicesSafely();
      const streams = devices.filter((device) => device.kind === "videoinput");

      // Stop streams from MediaDevices
      for (const device of streams) {
        try {
          const stream = await getUserMediaSafely({
            video: { deviceId: { exact: device.deviceId } },
          });
          stream.getTracks().forEach((track) => {
            track.stop();
            stream.removeTrack(track);
          });
        } catch (e) {
          console.log("Could not stop stream for device:", device.label);
        }
      }

      // Stop stream in video element
      if (videoRef.current?.srcObject instanceof MediaStream) {
        const currentStream = videoRef.current.srcObject;
        currentStream.getTracks().forEach((track) => {
          track.stop();
          currentStream.removeTrack(track);
        });
        videoRef.current.srcObject = null;
      }

      // Stop any other video elements that might be playing
      document.querySelectorAll("video").forEach((videoElement) => {
        if (videoElement.srcObject instanceof MediaStream) {
          const stream = videoElement.srcObject;
          stream.getTracks().forEach((track) => {
            track.stop();
            stream.removeTrack(track);
          });
          videoElement.srcObject = null;
        }
      });
    } catch (error) {
      console.error("Error stopping media streams:", error);
    }
  };

  // Add ref for tracking Camera component mount status
  const isCameraMounted = useRef(false);

  // Effect to handle video element initialization
  useEffect(() => {
    if (!cameraSettings.selectedCamera || capturedImage) return;

    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const initializeVideoElement = async () => {
      try {
        // Wait for Camera component to mount and create video element
        await new Promise((resolve) => setTimeout(resolve, 500));

        const videoElement = document.querySelector("video");
        if (!videoElement && mounted) {
          if (retryTimeout) clearTimeout(retryTimeout);
          retryTimeout = setTimeout(initializeVideoElement, 500);
          return;
        }

        if (videoElement instanceof HTMLVideoElement) {
          // Stop any existing streams
          if (videoRef.current?.srcObject instanceof MediaStream) {
            const oldStream = videoRef.current.srcObject as MediaStream;
            oldStream.getTracks().forEach((track) => {
              track.stop();
              oldStream.removeTrack(track);
            });
            videoRef.current.srcObject = null;
          }

          // Set up new video reference
          videoRef.current = videoElement;
          videoElement.style.width = "100%";
          videoElement.style.height = "100%";
          videoElement.style.objectFit = "cover";
          videoElement.setAttribute("playsinline", "true");
          videoElement.setAttribute("webkit-playsinline", "true");

          // Initialize camera stream
          const success = await setupVideoStream(cameraSettings.selectedCamera);
          if (!success && mounted) {
            console.error("Failed to initialize camera stream");
            setCameraError(true);
          }
        }
      } catch (error) {
        console.error("Error initializing video element:", error);
        if (mounted) {
          setCameraError(true);
        }
      }
    };

    initializeVideoElement();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      // Clean up any existing streams
      if (videoRef.current?.srcObject instanceof MediaStream) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
          stream.removeTrack(track);
        });
        videoRef.current.srcObject = null;
      }
    };
  }, [cameraSettings.selectedCamera, capturedImage]);

  // Modified setupVideoStream function
  const setupVideoStream = async (deviceId: string) => {
    try {
      console.log("Setting up video stream for device ID:", deviceId);
      await stopAllMediaStreams();

      const selectedDevice = availableCameras.find(
        (camera) => camera.deviceId === deviceId
      );

      if (!selectedDevice) {
        console.error("Selected camera not found:", deviceId);
        return false;
      }

      const isExternalOrBack = !isDefaultCamera(selectedDevice);

      const newMode = "environment";

      const constraints = {
        video: {
          deviceId: { exact: deviceId },
          facingMode: newMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      try {
        const stream = await getUserMediaSafely(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.transform = "none";
          videoRef.current.style.width = "100%";
          videoRef.current.style.height = "100vh";
          videoRef.current.style.objectFit = "cover";
          videoRef.current.style.position = "absolute";
          videoRef.current.style.inset = "0";
          videoRef.current.style.top = "0";
          videoRef.current.style.left = "0";
          videoRef.current.style.right = "0";
          videoRef.current.style.bottom = "0";

          try {
            await videoRef.current.play();

            // Update camera mode and settings
            if (isMobile || isExternalOrBack) {
              setCameraMode(newMode);
            }

            const newSettings = {
              ...cameraSettings,
              selectedCamera: deviceId,
              isLiveDetectionEnabled:
                isExternalOrBack || cameraSettings.isLiveDetectionEnabled,
            };
            console.log("Updating camera settings:", newSettings);
            setCameraSettings(newSettings);
            localStorage.setItem("cameraSettings", JSON.stringify(newSettings));

            return true;
          } catch (playError) {
            console.error("Error playing video:", playError);
            return false;
          }
        }
        return false;
      } catch (error) {
        console.warn("Failed with exact constraints, trying fallback:", error);
        const fallbackConstraints = {
          video: {
            deviceId: deviceId,
            facingMode: newMode,
          },
        };

        try {
          const fallbackStream = await getUserMediaSafely(
            fallbackConstraints
          );

          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.style.transform = "none";

            try {
              await videoRef.current.play();

              const newSettings = {
                ...cameraSettings,
                selectedCamera: deviceId,
                isLiveDetectionEnabled: cameraSettings.isLiveDetectionEnabled,
              };
              console.log("Updating camera settings (fallback):", newSettings);
              setCameraSettings(newSettings);
              localStorage.setItem(
                "cameraSettings",
                JSON.stringify(newSettings)
              );

              return true;
            } catch (playError) {
              console.error("Error playing fallback video:", playError);
              return false;
            }
          }
          return false;
        } catch (fallbackError) {
          console.error("Fallback stream failed:", fallbackError);
          return false;
        }
      }
    } catch (error) {
      console.error("Setup video stream failed:", error);
      return false;
    }
  };

  // Function to initialize cameras
  const initializeCameras = async () => {
    try {
      setIsInitializing(true);
      setCameraError(false);

      console.log("Starting camera initialization");

      // First ensure we have video permissions
      try {
        const stream = await getUserMediaSafely({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (permError) {
        console.error("Failed to get camera permissions:", permError);
        return;
      }

      // Get list of cameras
      const devices = await enumerateDevicesSafely();
      const cameras = devices.filter((device) => device.kind === "videoinput");
      console.log("Found cameras:", cameras);

      // Get stored camera settings
      const storedSettings = localStorage.getItem("cameraSettings");
      console.log("Retrieved stored settings:", storedSettings);

      let selectedCamera = null;

      // Try to use stored camera first
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        selectedCamera = cameras.find(
          (camera) => camera.deviceId === settings.selectedCamera
        );

        if (selectedCamera) {
          console.log(
            "Attempting to initialize stored camera:",
            selectedCamera.label
          );
          const success = await setupVideoStream(selectedCamera.deviceId);

          if (success) {
            console.log("Successfully initialized stored camera");
            setCameraSettings(settings);
            setIsInitializing(false);
            return;
          } else {
            console.log(
              "Failed to initialize stored camera, will try alternatives"
            );
            selectedCamera = null;
          }
        }
      }

      // If no stored camera or it failed, try to find external cameras
      if (!selectedCamera) {
        const externalCameras = cameras.filter(
          (camera) => !isDefaultCamera(camera)
        );
        console.log("Available external cameras:", externalCameras);

        // Try Camo camera first
        selectedCamera = externalCameras.find((camera) =>
          camera.label.toLowerCase().includes("camo")
        );

        // If no Camo, try any external camera
        if (!selectedCamera && externalCameras.length > 0) {
          selectedCamera = externalCameras[0];
        }

        if (selectedCamera) {
          console.log(
            "Attempting to initialize external camera:",
            selectedCamera.label
          );
          const success = await setupVideoStream(selectedCamera.deviceId);

          if (success) {
            console.log("Successfully initialized external camera");
            const newSettings = {
              selectedCamera: selectedCamera.deviceId,
              isMaskEnabled: true,
              isLiveDetectionEnabled: true,
            };
            setCameraSettings(newSettings);
            localStorage.setItem("cameraSettings", JSON.stringify(newSettings));
            setIsInitializing(false);
            return;
          } else {
            console.log("Failed to initialize external camera");
            selectedCamera = null;
          }
        }
      }

      // If all else fails, try each available camera
      console.log("Trying all available cameras as fallback");
      for (const camera of cameras) {
        console.log("Attempting to initialize camera:", camera.label);
        const success = await setupVideoStream(camera.deviceId);

        if (success) {
          console.log("Successfully initialized camera:", camera.label);
          const newSettings = {
            selectedCamera: camera.deviceId,
            isMaskEnabled: true,
            isLiveDetectionEnabled: !isDefaultCamera(camera),
          };
          setCameraSettings(newSettings);
          localStorage.setItem("cameraSettings", JSON.stringify(newSettings));
          setIsInitializing(false);
          return;
        }
      }

      throw new Error(
        "Failed to initialize any camera after trying all available options"
      );
    } catch (error) {
      console.error("Camera initialization failed:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  // Update Camera component to track mount status
  const handleCameraMount = useCallback((count: number) => {
    console.log("Camera component mounted, available cameras:", count);
    if (count === 0) {
      stopAllMediaStreams();
    }
    isCameraMounted.current = true;
  }, []);

  // Function to handle camera settings changes
  const handleSettingChange = async (
    setting: "isMaskEnabled" | "selectedCamera",
    value: boolean | string
  ) => {
    try {
      if (setting === "selectedCamera" && typeof value === "string") {
        setIsInitializing(true);

        const selectedDevice = availableCameras?.find(
          (camera) => camera.deviceId === value
        );

        if (!selectedDevice) {
          throw new Error("Selected camera not found");
        }

        const success = await setupVideoStream(value);

        if (!success) {
          throw new Error("Failed to setup video stream");
        }
      } else if (setting === "isMaskEnabled") {
        const newSettings = {
          ...cameraSettings,
          isMaskEnabled: value as boolean,
        };
        setCameraSettings(newSettings);
        localStorage.setItem("cameraSettings", JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error("Failed to change camera settings:", error);
      await initializeCameras();
    } finally {
      setIsInitializing(false);
    }
  };

  // Effect to ensure stream is active periodically
  const ensureStreamIsActive = useCallback(async () => {
    if (streamInitAttempts.current >= maxStreamAttempts) {
      console.error("Max stream initialization attempts reached");
      return;
    }

    try {
      if (videoRef.current?.srcObject instanceof MediaStream) {
        const stream = videoRef.current.srcObject;
        const videoTrack = stream.getVideoTracks()[0];

        if (
          !videoTrack ||
          !videoTrack.enabled ||
          videoTrack.readyState !== "live"
        ) {
          console.log("Stream not active, reinitializing...");
          streamInitAttempts.current++;
          await setupVideoStream(cameraSettings.selectedCamera);
        }
      } else if (cameraSettings.selectedCamera) {
        console.log("No stream found, initializing...");
        streamInitAttempts.current++;
        await setupVideoStream(cameraSettings.selectedCamera);
      }
    } catch (error) {
      console.error("Error ensuring stream is active:", error);
    }
  }, [cameraSettings.selectedCamera]);

  // Effect to check stream status periodically
  useEffect(() => {
    const checkStreamInterval = setInterval(async () => {
      if (!isStreamReady && !isInitializing) {
        await ensureStreamIsActive();
      }
    }, 1000);

    return () => clearInterval(checkStreamInterval);
  }, [isStreamReady, isInitializing]);

  // Effect to handle settings menu open/close
  useEffect(() => {
    if (cameraSettings.selectedCamera) {
      const reinitializeCamera = async () => {
        await stopAllMediaStreams();
        await setupVideoStream(cameraSettings.selectedCamera);
      };

      reinitializeCamera();
    }
  }, []);

  // curl -X POST -F 'image=@test_image.png' https://fishai.itrucksea.com/analyze | python -m json.tool

  interface GeminiAnalysisData {
    analysis: {
      en: {
        Species?: string;
        "Number of Fish (Estimate)"?: string;
        "Common Name"?: string;
        "Total Estimated Weight"?: string;
        [key: string]: string | undefined;
      };
      vi: {
        [key: string]: string | undefined;
      };
    };
  }

  interface ApiAnalysisData {
    detections?: Array<{
      classification: {
        species: string;
        common_name: string;
      };
      distance_analysis?: {
        estimated_weight_kg: number;
      };
    }>;
    fish_count?: number;
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

  const analyzeImage = async (imageSrc: string) => {
    try {
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

      const structuredResult = {
        success: true,
        processor: "gemini",
        analysis: {
          en: {},
          vi: {},
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
      

      And write more values if you can. Total Number of Fish need to count properly from the image. Write the response in Vietnamese and English if Vietnamese is not available then write  english value for vietnamese. Format each line exactly as "Key: Value" and separate with newlines. Do not include any additional text or formatting.
      `;

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
        navigate("/result-photo");
      } else {
        // Use existing fish AI API
        const formData = new FormData();
        formData.append("image", blob, "photo.jpg"); // Use .jpg extension for consistency

        const apiResponse = await fetch(
          "https://fishai.itrucksea.com/analyze",
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await apiResponse.json();

        // Convert API result to standardized format
        const apiStandardizedData: StandardizedFishData = {
          en: {
            common_name:
              result.detections?.[0]?.classification?.common_name || "",
            species: result.detections?.[0]?.classification?.species || "",
            total_number_of_fish: result.fish_count?.toString() || "",
            average_fish_size:
              result.detections?.[0]?.metrics?.size_category || "",
            estimated_weight_per_fish:
              result.detections?.[0]?.distance_analysis?.estimated_weight_kg?.toString() ||
              "",
            total_estimated_weight:
              (
                (result.fish_count || 0) *
                (result.detections?.[0]?.distance_analysis
                  ?.estimated_weight_kg || 0)
              ).toString() || "",
          },
          vi: {
            common_name:
              result.detections?.[0]?.classification?.common_name || "",
            species: result.detections?.[0]?.classification?.species || "",
            total_number_of_fish: result.fish_count?.toString() || "",
            average_fish_size:
              result.detections?.[0]?.metrics?.size_category || "",
            estimated_weight_per_fish:
              result.detections?.[0]?.distance_analysis?.estimated_weight_kg?.toString() ||
              "",
            total_estimated_weight:
              (
                (result.fish_count || 0) *
                (result.detections?.[0]?.distance_analysis
                  ?.estimated_weight_kg || 0)
              ).toString() || "",
          },
        };

        const fullResult = {
          ...result,
          analysis: apiStandardizedData,
        };

        localStorage.setItem("fishAnalysisResult", JSON.stringify(fullResult));
        navigate("/result-photo");
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
    }
  };

  // Function to capture photo
  const capture = async () => {
    if (!camera.current || isScanning) return;

    try {
      setIsScanning(true);
      const imageSrc = camera.current.takePhoto();

      // Store current distance when capturing
      setLastCapturedDistance(objectDistance);
      setCapturedImage(imageSrc);
      localStorage.setItem("myPhoto", imageSrc);

      localStorage.setItem("fishDistance", objectDistance?.toString() || "0");

      await rotateImageAsync(imageSrc, 90);
      await analyzeImage(imageSrc);
      console.log("Fish analysis completed");
    } catch (error) {
      console.error("Camera capture failed:", error);
    } finally {
      setIsScanning(false);
    }
  };

  // Function to reset capture
  const resetCapture = async () => {
    setCapturedImage(null);
    setLastCapturedDistance(null);

    // Get the stored settings
    const storedSettings = localStorage.getItem("cameraSettings");
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      if (settings.selectedCamera) {
        await setupVideoStream(settings.selectedCamera);
      } else {
        initializeCameras();
      }
    } else {
      initializeCameras();
    }
  };

  // Function to select from gallery
  const selectFromGallery = () => {
    if (!isScanning && fileInputRef.current) {
      // Stop current stream before opening gallery
      if (videoRef.current?.srcObject instanceof MediaStream) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsScanning(true);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        localStorage.setItem("myPhoto", imageData);
        await analyzeImage(imageData);
        console.log("Fish analysis from gallery completed");
        setIsScanning(false);
        // Reinitialize camera after gallery selection
        initializeCameras();
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to toggle camera mode (only for front camera)
  const toggleCameraMode = async () => {
    if (isScanning || !cameraSettings.selectedCamera) return;

    const selectedDevice = availableCameras.find(
      (camera) => camera.deviceId === cameraSettings.selectedCamera
    );

    // Only allow mode switching for default front camera
    if (selectedDevice && isDefaultCamera(selectedDevice)) {
      setCameraMode("environment");
      await setupVideoStream(cameraSettings.selectedCamera);
    }
  };

  // Function to rotate image if needed
  const rotateImageAsync = async (
    imageBase64: string,
    rotation: number
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageBase64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          const rotatedImage = canvas.toDataURL("image/jpeg");
          resolve(rotatedImage);
        } else {
          resolve(imageBase64); // Fallback to original if rotation fails
        }
      };
      img.onerror = () => resolve(imageBase64); // Fallback to original if loading fails
    });
  };

  const getAspectRatio = () => {
    // Use a more natural aspect ratio for face detection
    return window.innerHeight > window.innerWidth ? 9 / 16 : 16 / 9;
  };

  const navigateToResult = () => {
    navigate("/result-photo");
  };

  const handleCameraError = () => {
    setCameraError(true);
  };

  console.log(
    "is isLiveDetectionEnabled enabled: ",
    cameraSettings.isLiveDetectionEnabled
  );
  console.log("Video source: ", cameraSettings.selectedCamera);

  console.log("cameraMode:", cameraMode);

  // Add cleanup effect for component unmount
  useEffect(() => {
    return () => {
      setIsStreamReady(false);
      stopAllMediaStreams();
    };
  }, []);

  // Add cleanup effect for camera changes
  // useEffect(() => {
  //   const cleanup = async () => {
  //     await stopAllMediaStreams();
  //   };
  //   cleanup();
  // }, [cameraSettings.selectedCamera]);

  // Update settings menu effect
  // useEffect(() => {
  //   if (cameraSettings.selectedCamera) {
  //     const reinitializeCamera = async () => {
  //       await stopAllMediaStreams();
  //       await setupVideoStream(cameraSettings.selectedCamera);
  //     };
  //     reinitializeCamera();
  //   }
  // }, []);

  return (
    <div className="h-full min-h-screen md:min-h-screen bg-black">
      <div className="flex justify-center items-center h-full min-h-screen md:min-h-screen">
        <div
          className={`${
            isMobile ? "max-w-md w-full rounded-3xl" : "w-full rounded-3xl"
          } overflow-hidden relative shadow-lg`}
        >
          <div className="flex flex-col h-full min-h-screen ">
            {/* Header */}
            <div className="p-4 bg-black relative">
              <button
                onClick={() => navigate("/fishing-log/batch")}
                className="absolute left-4 top-4 text-white hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <h1 className="text-white text-xl font-bold text-center">
                Fish AI Scanner
              </h1>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="absolute right-4 top-4 text-white hover:text-gray-300 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center justify-center gap-4 mt-2">
                {objectDistance && (
                  <p className="text-white text-sm">
                    Distance: {objectDistance.toFixed(1)} cm
                  </p>
                )}
              </div>
              {isScanning && (
                <div className="flex items-center justify-center mt-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white mr-2" />
                  <span className="text-white text-xs">Analyzing fish...</span>
                </div>
              )}
            </div>

            {/* Camera Area */}
            <div className="relative flex-1 w-full h-full min-h-[calc(100vh-200px)] bg-black overflow-hidden">
              {isInitializing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
                    <p className="text-white text-sm">Initializing camera...</p>
                  </div>
                </div>
              ) : cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-center p-4 bg-white rounded-lg shadow-lg max-w-sm">
                    <h3 className="text-lg font-bold mb-2">Camera Error</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Unable to access camera. Please:
                      <br />
                      1. Check camera permissions
                      <br />
                      2. Ensure camera is connected
                      <br />
                      3. Try a different browser
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setCameraError(false);
                          setIsInitializing(true);
                          initializeCameras();
                        }}
                        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                      >
                        Retry Camera
                      </button>
                      <button
                        onClick={() => {
                          localStorage.removeItem("cameraSettings");
                          window.location.reload();
                        }}
                        className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                      >
                        Reset & Refresh
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full">
                  {cameraSettings.selectedCamera &&
                    !capturedImage &&
                    !isInitializing && (
                      <div className="relative w-full h-full">
                        <div className="absolute inset-0 w-full h-full">
                          <Camera
                            ref={camera}
                            key={`camera-${cameraSettings.selectedCamera}-${cameraMode}`}
                            numberOfCamerasCallback={handleCameraMount}
                            facingMode={cameraMode}
                            aspectRatio={getAspectRatio()}
                            videoSourceDeviceId={cameraSettings.selectedCamera}
                            errorMessages={{
                              noCameraAccessible:
                                "Please check camera permissions",
                              permissionDenied: "Camera permission denied",
                              switchCamera: "Cannot switch camera",
                              canvas: "Canvas not supported",
                            }}
                          />
                          {videoRef.current &&
                            cameraSettings.isLiveDetectionEnabled && (
                              <div className="absolute inset-0">
                                <FishDetectionAndAnalysis
                                  enabled={true}
                                  showOverlay={true}
                                  videoElement={videoRef.current}
                                  cameraMode={cameraMode}
                                  onFishDetected={(fishInfo) => {
                                    // Existing fish info handling
                                  }}
                                  onDistanceUpdate={(distance) => {
                                    if (distance > 0) {
                                      setObjectDistance(distance);
                                    }
                                  }}
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  {capturedImage && (
                    <div className="relative w-full h-full">
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover"
                      />
                      {lastCapturedDistance && (
                        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
                          Distance: {lastCapturedDistance.toFixed(1)} cm
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40">
              <div className="flex items-center justify-center space-x-4">
                {/* Gallery Button */}
                {!isMobile && (
                  <button
                    onClick={selectFromGallery}
                    disabled={isScanning}
                    className="bg-gray-600 text-white w-10 h-10 rounded-full hover:bg-gray-700 transition-colors shadow-lg flex items-center justify-center text-sm disabled:opacity-50"
                    title="Select from Gallery"
                  >
                    <FaImage />
                  </button>
                )}

                {/* Capture/Info Button */}
                {!capturedImage && !isScanning ? (
                  <button
                    onClick={capture}
                    disabled={isScanning}
                    className="bg-white text-black w-14 h-14 rounded-full hover:bg-blue-600 transition-colors shadow-lg flex items-center justify-center text-xl border-4 border-white disabled:opacity-50"
                    title="Scan Fish"
                  >
                    {isScanning ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Scan className="w-6 h-6" />
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate("/result-photo")}
                      className="bg-white text-black w-14 h-14 rounded-full hover:bg-green-600 transition-colors shadow-lg flex items-center justify-center text-xl border-4 border-white"
                      title="View Results"
                      disabled={isScanning}
                    >
                      {isScanning ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Info className="w-6 h-6" />
                      )}
                    </button>

                    <button
                      onClick={resetCapture}
                      className="bg-gray-600 text-white w-10 h-10 rounded-full hover:bg-gray-700 transition-colors shadow-lg flex items-center justify-center text-sm disabled:opacity-50"
                      title="Reset Capture"
                    >
                      <FaSync className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Scanning indicator overlay */}
            {isScanning && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
                  <p className="text-white text-lg font-bold">
                    Scanning Fish...
                  </p>
                  <p className="text-white text-sm">
                    AI is analyzing your catch
                  </p>
                </div>
              </div>
            )}

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
        </div>
      </div>
    </div>
  );
}
