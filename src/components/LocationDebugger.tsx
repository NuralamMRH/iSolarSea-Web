import React, { useState, useEffect } from 'react';
import { locationService } from '@/lib/location-service';

interface LocationDebugInfo {
  browserSupport: boolean;
  permissionStatus: string;
  highAccuracy: boolean;
  errors: string[];
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
  };
  googleMapsStatus: boolean;
  ipLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
  };
}

export const LocationDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<LocationDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const runLocationDiagnostics = async () => {
    setIsLoading(true);
    setTestResults([]);
    const results: string[] = [];

    try {
      // Check location status
      results.push("🔍 Checking location service status...");
      const status = await locationService.checkLocationStatus();
      
      // Test Google Maps initialization
      results.push("🗺️ Testing Google Maps initialization...");
      const googleMapsStatus = await locationService.initGoogleMaps();
      
      // Test current location
      results.push("📍 Testing current location...");
      let currentLocation;
      let ipLocation;
      
      try {
        currentLocation = await locationService.getCurrentLocation();
        results.push(`✅ Current location obtained: ${currentLocation.latitude}, ${currentLocation.longitude}`);
      } catch (error) {
        results.push(`❌ Current location failed: ${error}`);
        
        // Try IP-based location as fallback
        try {
          results.push("🌐 Trying IP-based location fallback...");
          // Access the private method through reflection
          const ipLocationMethod = (locationService as unknown as { getIPBasedLocation: () => Promise<{ latitude: number; longitude: number; accuracy?: number; timestamp?: string }> }).getIPBasedLocation;
          if (ipLocationMethod) {
            ipLocation = await ipLocationMethod.call(locationService);
            results.push(`✅ IP location obtained: ${ipLocation.latitude}, ${ipLocation.longitude}`);
          } else {
            results.push("❌ IP location method not available");
          }
        } catch (ipError) {
          results.push(`❌ IP location failed: ${ipError}`);
        }
      }

      const debugData: LocationDebugInfo = {
        ...status,
        currentLocation,
        googleMapsStatus,
        ipLocation,
      };

      setDebugInfo(debugData);
      results.push("✅ Diagnostics completed");
      
    } catch (error) {
      results.push(`❌ Diagnostics failed: ${error}`);
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const testGeolocationPermissions = async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setTestResults(prev => [...prev, `🔐 Geolocation permission: ${permission.state}`]);
        
        permission.addEventListener('change', () => {
          setTestResults(prev => [...prev, `🔄 Permission changed to: ${permission.state}`]);
        });
      } catch (error) {
        setTestResults(prev => [...prev, `❌ Permission check failed: ${error}`]);
      }
    } else {
      setTestResults(prev => [...prev, "❌ Permissions API not supported"]);
    }
  };

  const testBrowserGeolocation = () => {
    if (navigator.geolocation) {
      setTestResults(prev => [...prev, "🌐 Testing browser geolocation directly..."]);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTestResults(prev => [...prev, 
            `✅ Browser geolocation success: ${position.coords.latitude}, ${position.coords.longitude}`,
            `📊 Accuracy: ${position.coords.accuracy}m`,
            `⏰ Timestamp: ${new Date(position.timestamp).toLocaleString()}`
          ]);
        },
        (error) => {
          setTestResults(prev => [...prev, 
            `❌ Browser geolocation failed: Code ${error.code}`,
            `📝 Message: ${error.message}`
          ]);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000,
        }
      );
    } else {
      setTestResults(prev => [...prev, "❌ Browser geolocation not supported"]);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Location Services Debugger</h2>
      
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={runLocationDiagnostics}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Running Diagnostics..." : "Run Full Diagnostics"}
          </button>
          
          <button
            onClick={testGeolocationPermissions}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Permissions
          </button>
          
          <button
            onClick={testBrowserGeolocation}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Test Browser Geolocation
          </button>
          
          <button
            onClick={() => setTestResults([])}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>

        {debugInfo && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Location Service Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Browser Support:</strong> {debugInfo.browserSupport ? "✅ Yes" : "❌ No"}
              </div>
              <div>
                <strong>Permission Status:</strong> {debugInfo.permissionStatus}
              </div>
              <div>
                <strong>High Accuracy:</strong> {debugInfo.highAccuracy ? "✅ Yes" : "❌ No"}
              </div>
              <div>
                <strong>Google Maps:</strong> {debugInfo.googleMapsStatus ? "✅ Loaded" : "❌ Failed"}
              </div>
              {debugInfo.currentLocation && (
                <div className="col-span-2">
                  <strong>Current Location:</strong> {debugInfo.currentLocation.latitude.toFixed(6)}, {debugInfo.currentLocation.longitude.toFixed(6)}
                  {debugInfo.currentLocation.accuracy && ` (±${debugInfo.currentLocation.accuracy}m)`}
                </div>
              )}
              {debugInfo.ipLocation && (
                <div className="col-span-2">
                  <strong>IP Location:</strong> {debugInfo.ipLocation.latitude.toFixed(6)}, {debugInfo.ipLocation.longitude.toFixed(6)}
                </div>
              )}
              {debugInfo.errors.length > 0 && (
                <div className="col-span-2">
                  <strong>Errors:</strong>
                  <ul className="list-disc list-inside text-red-600">
                    {debugInfo.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {testResults.length > 0 && (
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2 text-white">Test Results</h3>
            {testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationDebugger;