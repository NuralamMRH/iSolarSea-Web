import React, { useState, useEffect } from 'react';
import { locationService } from '@/lib/location-service';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

interface LocationStatus {
  browserSupport: boolean;
  permissionStatus: string;
  highAccuracy: boolean;
  errors: string[];
}

export default function LocationTest() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationStatus | null>(null);
  const { toast } = useToast();

  const checkLocationStatus = async () => {
    try {
      setLoading(true);
      const statusResult = await locationService.checkLocationStatus();
      setStatus(statusResult);
      console.log('Location status:', statusResult);
      
      if (statusResult.errors.length > 0) {
        setError(statusResult.errors.join(', '));
        toast({
          title: 'Location Status',
          description: `Issues detected: ${statusResult.errors.join(', ')}`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Location Status',
          description: `Location services are working properly. Permission: ${statusResult.permissionStatus}`,
          variant: 'default'
        });
      }
    } catch (err) {
      console.error('Error checking location status:', err);
      setError(`Failed to check location status: ${err}`);
      toast({
        title: 'Error',
        description: `Failed to check location status: ${err}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      const locationData = await locationService.getCurrentLocation();
      setLocation(locationData);
      console.log('Location data:', locationData);
      toast({
        title: 'Location Retrieved',
        description: `Lat: ${locationData.latitude.toFixed(6)}, Lng: ${locationData.longitude.toFixed(6)}`,
        variant: 'default'
      });
    } catch (err) {
      console.error('Error getting location:', err);
      setError(`${err}`);
      toast({
        title: 'Location Error',
        description: `${err}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Location Test Page</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Location Status</h2>
          <button 
            onClick={checkLocationStatus}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
          >
            {loading ? 'Checking...' : 'Check Location Status'}
          </button>
          
          {status && (
            <div className="mt-4 space-y-2">
              <p><strong>Browser Support:</strong> {status.browserSupport ? 'Yes' : 'No'}</p>
              <p><strong>Permission Status:</strong> {status.permissionStatus}</p>
              <p><strong>High Accuracy:</strong> {status.highAccuracy ? 'Yes' : 'No'}</p>
              {status.errors.length > 0 && (
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="font-semibold text-red-700">Errors:</p>
                  <ul className="list-disc pl-5">
                    {status.errors.map((err, index) => (
                      <li key={index} className="text-red-600">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Get Current Location</h2>
          <button 
            onClick={getLocation}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Getting Location...' : 'Get My Location'}
          </button>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          
          {location && (
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h3 className="font-semibold text-blue-800">Location Data:</h3>
              <p><strong>Latitude:</strong> {location.latitude.toFixed(6)}</p>
              <p><strong>Longitude:</strong> {location.longitude.toFixed(6)}</p>
              {location.accuracy && <p><strong>Accuracy:</strong> {location.accuracy.toFixed(2)} meters</p>}
              {location.timestamp && <p><strong>Timestamp:</strong> {new Date(location.timestamp).toLocaleString()}</p>}
              
              <div className="mt-2">
                <a 
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View on Google Maps
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}