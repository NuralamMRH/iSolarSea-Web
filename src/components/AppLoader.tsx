import React, { useState, useEffect } from "react";
import LoadingScreen from "./LoadingScreen";
import App from "../App";

const AppLoader: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    // Check if all critical resources are loaded
    const checkResourcesLoaded = () => {
      const images = document.querySelectorAll("img");
      const scripts = document.querySelectorAll("script");
      let loadedImages = 0;
      let loadedScripts = 0;

      const checkImageLoad = () => {
        loadedImages++;
        if (loadedImages === images.length) {
          setLoadingProgress(95);
        }
      };

      const checkScriptLoad = () => {
        loadedScripts++;
        if (loadedScripts === scripts.length) {
          setLoadingProgress(98);
        }
      };

      // Check if images are loaded
      images.forEach((img) => {
        if (img.complete) {
          checkImageLoad();
        } else {
          img.addEventListener("load", checkImageLoad);
          img.addEventListener("error", checkImageLoad);
        }
      });

      // Check if scripts are loaded
      scripts.forEach((script) => {
        if (script.getAttribute("src")) {
          script.addEventListener("load", checkScriptLoad);
          script.addEventListener("error", checkScriptLoad);
        } else {
          checkScriptLoad();
        }
      });

      // If no images or scripts, set progress to 95%
      if (images.length === 0 && scripts.length === 0) {
        setLoadingProgress(95);
      }
    };

    // Start checking resources after a short delay
    setTimeout(checkResourcesLoaded, 100);

    // Complete loading after minimum time and when resources are ready
    const completeLoading = () => {
      setLoadingProgress(100);
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    };

    // Complete loading after maximum 3 seconds or when progress reaches 98%
    const timeoutId = setTimeout(completeLoading, 3000);

    const progressCheck = setInterval(() => {
      if (loadingProgress >= 98) {
        clearInterval(progressCheck);
        clearTimeout(timeoutId);
        completeLoading();
      }
    }, 100);

    return () => {
      clearInterval(progressInterval);
      clearInterval(progressCheck);
      clearTimeout(timeoutId);
    };
  }, [loadingProgress]);

  if (isLoading) {
    return (
      <div>
        <LoadingScreen isLoading={true} />
        {/* Progress indicator */}
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            color: "white",
            fontSize: "14px",
            textAlign: "center",
            background: "rgba(0, 0, 0, 0.3)",
            padding: "8px 16px",
            borderRadius: "20px",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ marginBottom: "4px" }}>
            Loading... {Math.round(loadingProgress)}%
          </div>
          <div
            style={{
              width: "200px",
              height: "3px",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${loadingProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #3b82f6, #06b6d4)",
                transition: "width 0.3s ease",
                borderRadius: "2px",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return <App />;
};

export default AppLoader;
