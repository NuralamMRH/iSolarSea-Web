import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Video, Eye, Scan } from "lucide-react";

interface CameraSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    isMaskEnabled: boolean;
    isLiveDetectionEnabled: boolean;
    selectedCamera: string;
  };
  onSettingChange: (
    setting: "isMaskEnabled" | "isLiveDetectionEnabled" | "selectedCamera",
    value: boolean | string
  ) => void;
  availableCameras: MediaDeviceInfo[];
}

const CameraSettings: React.FC<CameraSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingChange,
  availableCameras,
}) => {
  console.log("selectedCamera in settings", settings.selectedCamera);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />

          {/* Settings Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-gray-900 text-white z-50 p-6 shadow-lg"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Camera Settings</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Camera Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Video className="w-4 h-4" />
                  Camera Source
                </label>
                <select
                  value={settings.selectedCamera}
                  onChange={(e) =>
                    onSettingChange("selectedCamera", e.target.value)
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableCameras.map((camera) => (
                    <option
                      key={camera.deviceId}
                      value={camera.deviceId}
                      className="capitalize"
                    >
                      {camera.label ||
                        `Camera ${camera.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Face Mask Toggle */}
              {/* <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Eye className="w-4 h-4" />
                  Face Mask Overlay
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isMaskEnabled}
                    onChange={(e) =>
                      onSettingChange("isMaskEnabled", e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div> */}

              {/* Live Detection Toggle */}
              {/* <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Scan className="w-4 h-4" />
                  Live Detection
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isLiveDetectionEnabled}
                    onChange={(e) =>
                      onSettingChange(
                        "isLiveDetectionEnabled",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div> */}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CameraSettings;
