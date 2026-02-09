import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Vessel = Database["public"]["Tables"]["vessels"]["Row"] & {
  fishing_trips: Database["public"]["Tables"]["fishing_trips"]["Row"][];
};

type Region = {
  id: string;
  name: string;
  code: string;
};

type VesselType = "mining" | "logistics" | "other";

export default function VesselsFilter() {
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

  const fetchVessels = async () => {
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
      setVessels(data || []);
      setFilteredVessels(data || []);
    } catch (error) {
      console.error("Error fetching vessels:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.auth_id) {
      fetchVessels();
    }
  }, [user?.auth_id]);

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
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Region Filter */}
        <div className="region-filter flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Region
          </label>
          <select
            className="w-full h-10 p-2 border rounded-md"
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
        </div>

        {/* Vessel Type Filter */}
        <div className="vessel-type-filter flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Vessel Type
          </label>
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-md ${
                selectedType === "mining"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={() =>
                setSelectedType((prev) => (prev === "mining" ? "" : "mining"))
              }
            >
              Tàu Khai Thác
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                selectedType === "logistics"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
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
              className={`px-4 py-2 rounded-md ${
                selectedType === "other"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
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

      {/* Vessels List */}
      <div className="vessels-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">
            Loading vessels...
          </div>
        ) : filteredVessels.length === 0 ? (
          <div className="col-span-full text-center py-8">
            No vessels found matching the filters
          </div>
        ) : (
          filteredVessels.map((vessel) => {
            const latestTrip =
              vessel.fishing_trips?.[vessel.fishing_trips.length - 1];
            return (
              <Link
                key={vessel.id}
                to={`/dashboard/vessel-details/${vessel.id}`}
              >
                <div className="vessel-card bg-white p-4 rounded-lg shadow border-2 border-black">
                  <h3 className="font-bold text-lg mb-2">{vessel.name}</h3>
                  <div className="text-sm text-gray-600">
                    <p>Registration: {vessel.registration_number}</p>
                    <p>Type: {vessel.type || "N/A"}</p>
                    <p>Current Region: {latestTrip?.to_region || "N/A"}</p>
                    <p>Status: {latestTrip?.status || "N/A"}</p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
