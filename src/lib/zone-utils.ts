import { supabase } from "@/lib/supabase";

export type ZoneInfo = {
  zoneCode: string | null; // e.g., "1", "2", "3", "4" or null
  zoneName: string | null; // e.g., "ZoneC-EC C42(10.040095-115.529907)"
  seaportId?: string | null;
  distanceMeters?: number | null;
};

// Minimal seaport type for zone computation
type Seaport = {
  id: string;
  name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  classification?: number | string | null;
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute nearest seaport and return its classification as zone
export async function computeZoneByNearestSeaport(
  latitude: number,
  longitude: number
): Promise<ZoneInfo> {
  try {
    const { data: ports, error } = await supabase
      .from("seaports")
      .select("id, name, latitude, longitude, classification");
    if (error) throw error;
    const portsData: Seaport[] = Array.isArray(ports) ? (ports as Seaport[]) : [];
    if (portsData.length === 0) {
      return { zoneCode: null, zoneName: null };
    }

    let nearest: Seaport | null = null;
    let minDist = Number.POSITIVE_INFINITY;
    for (const p of portsData) {
      const plat = Number(p.latitude ?? NaN);
      const plon = Number(p.longitude ?? NaN);
      if (isNaN(plat) || isNaN(plon)) continue;
      const d = haversineDistanceMeters(latitude, longitude, plat, plon);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }

    if (!nearest) return { zoneCode: null, zoneName: null };

    const zoneCode = nearest.classification != null
      ? String(nearest.classification)
      : null;

    // Derive zone key based on defined map areas (A/B/C), else X
    const zoneKey = computeZoneKeyByAreas(latitude, longitude);
    const secondKey = deriveSecondKey(zoneKey);
    const ecNumber = computeECNumber(latitude, longitude, zoneKey);
    const latPart = Number.isFinite(latitude) ? latitude.toFixed(6) : String(latitude);
    const lonPart = Number.isFinite(longitude) ? longitude.toFixed(6) : String(longitude);
    const zoneName = `Zone${zoneKey}-EC${secondKey}${ecNumber}(${latPart}-${lonPart})`;
    return {
      zoneCode,
      zoneName,
      seaportId: nearest.id,
      distanceMeters: minDist,
    };
  } catch (e) {
    console.error("computeZoneByNearestSeaport error:", e);
    return { zoneCode: null, zoneName: null };
  }
}

// Helper to turn a classification number to display name
export function formatZoneDisplay(zoneCode: string | null): string {
  if (!zoneCode) return "Unknown Zone";
  return `Zone ${zoneCode}`;
}

// Traditional Coastal Regions (A-D) mapping based on lat/lon bounds
// Geometry helpers
type LatLng = { lat: number; lng: number };

function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInCircle(point: LatLng, center: LatLng, radiusMeters: number): boolean {
  const d = haversineDistanceMeters(point.lat, point.lng, center.lat, center.lng);
  return d <= radiusMeters;
}

// Defined areas for zones
const ZONE_C_POLYGON: LatLng[] = [
  { lat: 19.2697, lng: 105.8217 },
  { lat: 19.1802, lng: 106.1732 },
  { lat: 15.398582, lng: 108.741024 },
  { lat: 15.797157, lng: 109.023201 },
];
const ZONE_C_CIRCLES = [
  { center: { lat: 16.307907, lng: 111.887631 }, radius: 50_000 },
  { center: { lat: 15.776189, lng: 114.335378 }, radius: 25_000 },
];

const ZONE_B_POLYGON: LatLng[] = [
  { lat: 15.398582, lng: 108.741024 },
  { lat: 15.797157, lng: 109.023201 },
  { lat: 11.290790, lng: 108.805857 },
  { lat: 10.751607, lng: 109.426080 },
];

const ZONE_A_POLYGON_1: LatLng[] = [
  { lat: 11.290790, lng: 108.805857 },
  { lat: 10.751607, lng: 109.426080 },
  { lat: 9.243116, lng: 105.827099 },
  { lat: 8.341218, lng: 106.056200 },
];
const ZONE_A_POLYGON_2: LatLng[] = [
  { lat: 11.699559, lng: 114.105746 },
  { lat: 10.816024, lng: 116.323181 },
  { lat: 8.563622, lng: 111.273575 },
  { lat: 5.795252, lng: 113.315372 },
];

function computeZoneKeyByAreas(latitude: number, longitude: number): string {
  const p = { lat: latitude, lng: longitude };
  // Zone C polygon or circles
  if (pointInPolygon(p, ZONE_C_POLYGON) || ZONE_C_CIRCLES.some(c => pointInCircle(p, c.center, c.radius))) {
    return "C";
  }
  // Zone B
  if (pointInPolygon(p, ZONE_B_POLYGON)) {
    return "B";
  }
  // Zone A (either polygon)
  if (pointInPolygon(p, ZONE_A_POLYGON_1) || pointInPolygon(p, ZONE_A_POLYGON_2)) {
    return "A";
  }
  // Not matched
  return "X";
}

function deriveSecondKey(zoneKey: string): string {
  // User specified example: X is 2nd key for ZoneD.
  // Default: use the same key; ZoneD special-cased to X if encountered.
  if (zoneKey === "D") return "X";
  return zoneKey;
}

function computeECNumber(latitude: number, longitude: number, zoneKey: string): number {
  // Deterministic index 1..99 based on lat/lon; simple and stable
  const a = Math.abs(Math.floor((latitude + 90) * 1000));
  const b = Math.abs(Math.floor((longitude + 180) * 1000));
  return ((a ^ b) % 99) + 1;
}