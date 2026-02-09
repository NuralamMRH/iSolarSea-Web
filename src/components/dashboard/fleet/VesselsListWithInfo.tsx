import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useEffect, useState, useCallback } from "react";
import VesselDetails from "./VesselDetails";

type Vessel = Database["public"]["Tables"]["vessels"]["Row"] & {
  fishing_trips: Database["public"]["Tables"]["fishing_trips"]["Row"][];
  current_zone?: string;
  current_trip_id?: string;
  trip_status?: string;
};

type VesselType = "mining" | "logistics" | "other";

export default function VesselsListWithInfo() {
  const { user } = useAuthStore();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [filteredVessels, setFilteredVessels] = useState<Vessel[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedType, setSelectedType] = useState<VesselType | "">("");
  const [loading, setLoading] = useState(false);

  const regions = [
    { id: "D", name: "D. Hai Phong - Quang Ninh (Vinh Bac Bo)", code: "D" },
    { id: "C", name: "C. Hoang Sa - Truong Sa", code: "C" },
    { id: "B", name: "B. NThuan - BThuan - BR. Vung Tau", code: "B" },
    { id: "A", name: "A. Ca Mau - Kien Giang", code: "A" },
  ];

  // Helper function to get region letter from region name
  const getRegionLetter = (str: string) => {
    // First try to find a direct letter match
    const letterMatch = str.match(/^[ABCD]\.?\s*/i);
    if (letterMatch) return letterMatch[0].charAt(0).toUpperCase();

    // If no direct letter, check for region names
    const regionMap: { [key: string]: string } = {
      "HAI PHONG": "D",
      "QUANG NINH": "D",
      "HOANG SA": "C",
      "TRUONG SA": "C",
      NTHUAN: "B",
      BTHUAN: "B",
      "VUNG TAU": "B",
      "CA MAU": "A",
      "KIEN GIANG": "A",
    };

    const upperStr = str.toUpperCase();
    for (const [key, value] of Object.entries(regionMap)) {
      if (upperStr.includes(key)) {
        return value;
      }
    }
    return "";
  };

  const fetchVessels = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vessels")
        .select(
          `
          *,
          fishing_trips (*)
        `
        )
        .eq("user_id", user?.auth_id || "");

      if (error) throw error;

      // Process vessels to add current trip info
      const processedVessels = (data || []).map((vessel) => {
        const latestTrip =
          vessel.fishing_trips?.[vessel.fishing_trips.length - 1];
        return {
          ...vessel,
          current_zone: latestTrip?.to_region || "Unknown",
          current_trip_id: latestTrip?.id || "N/A",
          trip_status: latestTrip?.status || "N/A",
        };
      });

      setVessels(processedVessels);
      setFilteredVessels(processedVessels);
    } catch (error) {
      console.error("Error fetching vessels:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.auth_id]);

  useEffect(() => {
    if (user?.auth_id) {
      fetchVessels();
    }
  }, [user?.auth_id, fetchVessels]);

  // Apply filters whenever selection changes
  useEffect(() => {
    let filtered = [...vessels];

    // Filter by region if selected
    if (selectedRegion) {
      filtered = filtered.filter((vessel) => {
        const latestTrip =
          vessel.fishing_trips?.[vessel.fishing_trips.length - 1];
        if (!latestTrip?.to_region) return false;
        return getRegionLetter(latestTrip.to_region) === selectedRegion;
      });
    }

    // Filter by vessel type if selected
    if (selectedType) {
      filtered = filtered.filter((vessel) => {
        switch (selectedType) {
          case "mining":
            return vessel.type?.toLowerCase() === "mining";
          case "logistics":
            return ["logistics", "transport"].includes(
              vessel.type?.toLowerCase() || ""
            );
          case "other":
            return !["mining", "logistics", "transport"].includes(
              vessel.type?.toLowerCase() || ""
            );
          default:
            return true;
        }
      });
    }

    setFilteredVessels(filtered);
  }, [selectedRegion, selectedType, vessels]);

  return (
    <div className="vessels-filter-container p-4">
      <div className="flex flex-col md:flex-column gap-4 mb-6">
        {/* Region Filter */}
        <div className="region-filter flex-1">
          <select
            className="w-full h-10 p-2 border rounded-md bg-blue-600 text-white"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            <option value="">All Regions</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
          <label className="block text-sm font-medium text-red-700 mb-2 float-end">
            Select region “A,B,C,D” from dop list
          </label>
        </div>

        {/* Vessel Type Filter */}
        <div className="vessel-type-filter flex-1">
          <div className="flex gap-2">
            <button
              className={`px-6 py-3 rounded-md ${
                selectedType === "mining"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 hover:bg-gray-200"
              }`}
              onClick={() =>
                setSelectedType((prev) => (prev === "mining" ? "" : "mining"))
              }
            >
              Tàu Khai Thác
            </button>
            <button
              className={`px-6 py-3 rounded-md ${
                selectedType === "logistics"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 hover:bg-gray-200"
              }`}
              onClick={() =>
                setSelectedType((prev) =>
                  prev === "logistics" ? "" : "logistics"
                )
              }
            >
              Tàu Hậu Cần
            </button>
            <button
              className={`px-6 py-3 rounded-md ${
                selectedType === "other"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 hover:bg-gray-200"
              }`}
              onClick={() =>
                setSelectedType((prev) => (prev === "other" ? "" : "other"))
              }
            >
              Khác
            </button>
          </div>
        </div>
      </div>

      {/* Vessels Details */}
      <div className="vessels-details">
        {loading ? (
          <div className="text-center py-8">Loading vessels...</div>
        ) : filteredVessels.length === 0 ? (
          <div className="text-center py-8">
            No vessels found matching the filters
          </div>
        ) : (
          <div className="space-y-8">
            {filteredVessels
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              )
              .map((vessel) => (
                <VesselDetails key={vessel.id} vessel={vessel} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
