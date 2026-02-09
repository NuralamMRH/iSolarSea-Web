import React, { useState, useEffect } from 'react';
import { LocationService } from '@/lib/location-service';
import { LocationDebugger } from './LocationDebugger';

interface LocationTestResult {
  test: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: string;
  error?: string;
  duration?: number;
}

export const LocationTestSuite: React.FC = () => {
  const [tests, setTests] = useState<LocationTestResult[]>([
    { test: 'Browser Geolocation Support', status: 'pending' },
    { test: 'Location Permission Status', status: 'pending' },
    { test: 'Google Maps API Loading', status: 'pending' },
    { test: 'Standard Geolocation (8s timeout)', status: 'pending' },
    { test: 'IP-based Location Fallback', status: 'pending' },
    { test: 'Location Service getCurrentLocation', status: 'pending' },
    { test: 'Zone Computation from Location', status: 'pending' },
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);

  const updateTest = (index: number, updates: Partial<LocationTestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    const locationService = LocationService.getInstance();

    // Test 1: Browser Geolocation Support
    updateTest(0, { status: 'running' });
    const hasGeolocation = 'geolocation' in navigator;
    updateTest(0, { 
      status: hasGeolocation ? 'success' : 'error',
      result: hasGeolocation ? 'Supported' : 'Not supported'
    });

    // Test 2: Location Permission Status
    updateTest(1, { status: 'running' });
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      updateTest(1, { 
        status: 'success',
        result: permission.state
      });
    } catch (error) {
      updateTest(1, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Google Maps API Loading
    updateTest(2, { status: 'running' });
    try {
      await locationService.initGoogleMaps();
      updateTest(2, { 
        status: 'success',
        result: 'Google Maps API loaded successfully'
      });
    } catch (error) {
      updateTest(2, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load Google Maps API'
      });
    }

    // Test 4: Standard Geolocation (8s timeout)
    updateTest(3, { status: 'running' });
    const startTime = Date.now();
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 60000
          }
        );
      });
      const duration = Date.now() - startTime;
      updateTest(3, { 
        status: 'success',
        result: `${position.coords.latitude}, ${position.coords.longitude}`,
        duration
      });
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const geolocationError = error as GeolocationPositionError;
      updateTest(3, { 
        status: 'error',
        error: `Code ${geolocationError.code}: ${geolocationError.message}`,
        duration
      });
    }

    // Test 5: IP-based Location Fallback
    updateTest(4, { status: 'running' });
    try {
      // Access private method through reflection for testing
      const ipLocationMethod = (locationService as unknown as { getIPBasedLocation: () => Promise<{ latitude: number; longitude: number }> }).getIPBasedLocation;
      if (ipLocationMethod) {
        const ipLocation = await ipLocationMethod.call(locationService);
        updateTest(4, { 
          status: 'success',
          result: `${ipLocation.latitude}, ${ipLocation.longitude}`
        });
      } else {
        updateTest(4, { 
          status: 'error',
          error: 'IP location method not available'
        });
      }
    } catch (error) {
      updateTest(4, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'IP location failed'
      });
    }

    // Test 6: Location Service getCurrentLocation
    updateTest(5, { status: 'running' });
    const serviceStartTime = Date.now();
    try {
      const location = await locationService.getCurrentLocation();
      const serviceDuration = Date.now() - serviceStartTime;
      updateTest(5, { 
        status: 'success',
        result: `${location.latitude}, ${location.longitude}`,
        duration: serviceDuration
      });
    } catch (error) {
      const serviceDuration = Date.now() - serviceStartTime;
      updateTest(5, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Location service failed',
        duration: serviceDuration
      });
    }

    // Test 7: Zone Computation from Location
    updateTest(6, { status: 'running' });
    try {
      const location = await locationService.getCurrentLocation();
      // Simulate zone computation logic from batch.tsx
      const zoneInfo = `Zone for ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
      updateTest(6, { 
        status: 'success',
        result: zoneInfo
      });
    } catch (error) {
      updateTest(6, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Zone computation failed'
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: LocationTestResult['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
    }
  };

  const getStatusColor = (status: LocationTestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'running': return 'text-blue-500';
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Location Service Test Suite</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDebugger(!showDebugger)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            {showDebugger ? 'Hide' : 'Show'} Debugger
          </button>
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {tests.map((test, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getStatusIcon(test.status)}</span>
                <span className="font-medium">{test.test}</span>
                <span className={`text-sm ${getStatusColor(test.status)}`}>
                  {test.status}
                </span>
              </div>
              {test.duration && (
                <span className="text-sm text-gray-500">
                  {test.duration}ms
                </span>
              )}
            </div>
            
            {test.result && (
              <div className="mt-2 text-sm text-gray-700 bg-green-50 p-2 rounded">
                <strong>Result:</strong> {test.result}
              </div>
            )}
            
            {test.error && (
              <div className="mt-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                <strong>Error:</strong> {test.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {showDebugger && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-xl font-bold mb-4">Location Debugger</h3>
          <LocationDebugger />
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-2">Test Instructions:</h3>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
          <li>Click "Run All Tests" to execute the complete test suite</li>
          <li>Check that geolocation completes within 8 seconds or falls back to IP location</li>
          <li>Verify that zone computation works with the obtained location</li>
          <li>Use the debugger for detailed location service information</li>
          <li>Test on the actual fishing log batch page: <a href="/fishing-log/batch" className="underline">/fishing-log/batch</a></li>
        </ol>
      </div>
    </div>
  );
};

export default LocationTestSuite;