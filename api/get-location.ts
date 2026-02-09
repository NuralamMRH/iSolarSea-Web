import { Request, Response } from "express";

/**
 * API endpoint to get location data from IP address
 * This acts as a proxy to avoid CORS issues with direct client-side requests
 */
export const getLocationHandler = async (req: Request, res: Response) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try multiple geolocation services in sequence
    
    // First try ipinfo.io (more reliable, no API key needed for basic usage)
    try {
      const response = await fetch('https://ipinfo.io/json');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.loc) {
          const [latitude, longitude] = data.loc.split(',').map(Number);
          
          return res.status(200).json({
            latitude,
            longitude,
            city: data.city,
            region: data.region,
            country: data.country,
            ip: data.ip
          });
        }
      }
    } catch (ipinfoError) {
      console.error('ipinfo.io service failed:', ipinfoError);
    }
    
    // Fallback to geolocation-db.com
    try {
      const response = await fetch('https://geolocation-db.com/json/');
      
      if (response.ok) {
        const data = await response.json();
        
        return res.status(200).json({
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          city: data.city,
          region: data.state,
          country: data.country_name,
          ip: data.IPv4
        });
      }
    } catch (geoDbError) {
      console.error('geolocation-db.com service failed:', geoDbError);
    }
    
    throw new Error('All geolocation services failed');
  } catch (error) {
    console.error('Error fetching location data:', error);
    
    // Fallback to a default location if all services are unavailable
    return res.status(500).json({
      error: 'Failed to fetch location data',
      latitude: 0,
      longitude: 0
    });
  }
};