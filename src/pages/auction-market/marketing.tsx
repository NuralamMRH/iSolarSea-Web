import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { useEffect, useState, useMemo, useRef } from "react";
import { getCurrentUser, supabase } from "@/lib/supabase";
import { QRCodeCanvas } from "qrcode.react";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, QrCode, ShoppingCart } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { useCartStore } from "@/stores/cart-store";
import { CartSummaryPopup } from "@/components/cart-summary-popup";
import AuctionQRScanner from "@/components/auction/AuctionQRScanner";
import { Link } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { useIsMobile } from "@/hooks/use-mobile";

// Utility functions from 2share-loading.tsx
const convertShorthandPrice = (value: string): number => {
  const cleanValue = value.replace(/,/g, "").toLowerCase();

  if (cleanValue.includes("k")) {
    return parseFloat(cleanValue.replace("k", "")) * 1000;
  } else if (cleanValue.includes("m")) {
    return parseFloat(cleanValue.replace("m", "")) * 1000000;
  } else if (cleanValue.includes("b")) {
    return parseFloat(cleanValue.replace("b", "")) * 1000000000;
  }

  return parseFloat(cleanValue) || 0;
};

const formatNumberWithCommas = (value: string | number): string => {
  if (typeof value === "string") {
    const numValue = parseFloat(value.replace(/,/g, ""));
    if (isNaN(numValue)) return value;
    return numValue.toLocaleString();
  }
  return value.toLocaleString();
};

const shouldConvertShorthand = (value: string): boolean => {
  const lowerValue = value.toLowerCase();
  return (
    lowerValue.includes("k") ||
    lowerValue.includes("m") ||
    lowerValue.includes("b")
  );
};

const parseInputValue = (value: string): string => {
  if (shouldConvertShorthand(value)) {
    const converted = convertShorthandPrice(value);
    return converted.toString();
  }

  const numericValue = parseFloat(value.replace(/,/g, ""));
  return isNaN(numericValue) ? value : numericValue.toString();
};

const extractNumberFromFishSize = (fishSize: string | null): number => {
  if (!fishSize) return 0;
  const match = fishSize.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

interface CatchRecordWithHaul
  extends Omit<
    Database["public"]["Tables"]["catch_records"]["Row"],
    "haul_id"
  > {
  haul_id: { id: string; haul_number: number; qr_code: string } | string;
  tank: string;
  species: string;
  fish_size: string;
  quantity: number;
  id: string;
  image_url: string;
  net_kg_per_case: string;
}

function AuctionContainer() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const cartStore = useCartStore();
  const selectedTankKeyRef = useRef<string | null>(null);
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    successQr: string | null;
  }>({ isOpen: false, successQr: null });
  // State variables
  const [trips, setTrips] = useState<
    Database["public"]["Tables"]["fishing_trips"]["Row"][]
  >([]);
  const [vessels, setVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
  const [ports, setPorts] = useState<
    Database["public"]["Tables"]["seaports"]["Row"][]
  >([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [catchRecords, setCatchRecords] = useState<CatchRecordWithHaul[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Search and UI states
  const [searchTerm, setSearchTerm] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [showCartSummary, setShowCartSummary] = useState(false);
  const [scannedCatchRecord, setScannedCatchRecord] =
    useState<CatchRecordWithHaul | null>(null);

  // Vessel and trip search states
  const [vesselSearchTerm, setVesselSearchTerm] = useState("");
  const [tripSearchTerm, setTripSearchTerm] = useState("");
  const [showVesselDropdown, setShowVesselDropdown] = useState(false);
  const [showTripDropdown, setShowTripDropdown] = useState(false);

  // Order forms for each tank
  const [orderForms, setOrderForms] = useState<
    Record<string, { quantity_load: string; bid_price: string }>
  >({});

  // Set cart type to 2BuyListing when component mounts
  useEffect(() => {
    cartStore.setCartType("2BuyListing");
  }, []);

  // Auto-select default vessel from user.default_vessel or latest vessel
  useEffect(() => {
    if (vessels.length > 0 && !selectedVesselId) {
      let defaultVessel = null;

      if (user?.default_vessel) {
        defaultVessel = vessels.find((v) => v.id === user.default_vessel);
      }

      if (!defaultVessel) {
        // Select the latest vessel by created_at
        defaultVessel = vessels.reduce((latest, current) => {
          return new Date(current.created_at || 0) >
            new Date(latest.created_at || 0)
            ? current
            : latest;
        });
      }

      if (defaultVessel) {
        setSelectedVesselId(defaultVessel.id);
      }
    }
  }, [vessels, user?.default_vessel, selectedVesselId]);

  // Clear order forms when vessel changes
  useEffect(() => {
    if (selectedVesselId) {
      setOrderForms({});
    }
  }, [selectedVesselId]);

  // Auto-select latest trip when vessel is selected
  useEffect(() => {
    if (selectedVesselId && trips.length > 0) {
      const vesselTrips = trips.filter(
        (trip) => trip.vessel_id === selectedVesselId
      );
      if (vesselTrips.length > 0) {
        const latestTrip = vesselTrips.reduce((latest, current) => {
          return new Date(current.created_at || 0) >
            new Date(latest.created_at || 0)
            ? current
            : latest;
        });
        setSelectedTripId(latestTrip.id);
      }
    }
  }, [selectedVesselId, trips]);

  // Fetch catch records when trip is selected
  useEffect(() => {
    if (selectedTripId) {
      fetchCatchRecordsForTrip(selectedTripId);
    }
  }, [selectedTripId]);

  // Fetch initial data
  useEffect(() => {
    fetchVessels();
    fetchPorts();
    fetchTrips();
  }, []);

  const fetchVessels = async () => {
    try {
      // Get user's auth ID
      const userId = user?.auth_id;
      if (!userId) {
        console.error("User not authenticated");
        return;
      }

      // Fetch vessels that the user owns
      const { data: ownedVessels, error: ownedError } = await supabase
        .from("vessels")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (ownedError) {
        console.error("Error fetching owned vessels:", ownedError);
      }

      // Fetch vessels that the user has access to through vessel access control
      const { data: accessData, error: accessError } = await supabase
        .from("vessel_access_control")
        .select("vessel_id")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (accessError) {
        console.error("Error fetching vessel access:", accessError);
      }

      // Get vessel IDs that user has access to
      const accessibleVesselIds =
        accessData?.map((item) => item.vessel_id) || [];

      // Fetch accessible vessels
      let accessibleVessels: Record<string, unknown>[] = [];
      if (accessibleVesselIds.length > 0) {
        const { data: accessibleData, error: accessibleError } = await supabase
          .from("vessels")
          .select("*")
          .in("id", accessibleVesselIds)
          .order("created_at", { ascending: false });

        if (accessibleError) {
          console.error("Error fetching accessible vessels:", accessibleError);
        } else {
          accessibleVessels = accessibleData || [];
        }
      }

      // Combine owned and accessible vessels, removing duplicates
      const allVessels = [...(ownedVessels || []), ...accessibleVessels];
      const uniqueVessels = allVessels.filter(
        (vessel, index, self) =>
          index === self.findIndex((v) => v.id === vessel.id)
      );

      console.log("Owned vessels:", ownedVessels?.length || 0);
      console.log("Accessible vessels:", accessibleVessels.length);
      console.log("Total unique vessels:", uniqueVessels.length);

      setVessels(uniqueVessels);
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  };

  const fetchPorts = async () => {
    try {
      const { data, error } = await supabase
        .from("seaports")
        .select("*")
        .order("name");

      if (error) throw error;
      setPorts(data || []);
    } catch (error) {
      console.error("Error fetching ports:", error);
    }
  };

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from("fishing_trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  const fetchCatchRecordsForTrip = async (tripId: string) => {
    setLoading(true);
    try {
      // First get fishing_hauls for this trip
      const { data: hauls, error: haulsError } = await supabase
        .from("fishing_hauls")
        .select("id")
        .eq("trip_id", tripId);

      if (haulsError) throw haulsError;

      if (!hauls || hauls.length === 0) {
        setCatchRecords([]);
        return;
      }

      const haulIds = hauls.map((h: { id: string }) => h.id);

      // Then get catch_records for these hauls
      const { data: records, error: recordsError } = await supabase
        .from("catch_records")
        .select(
          `
          *,
          haul_id!inner(id, haul_number, qr_code)
        `
        )
        .in("haul_id", haulIds);

      if (recordsError) throw recordsError;

      setCatchRecords(records || []);
    } catch (error) {
      console.error("Error fetching catch records:", error);
      setCatchRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter catch records based on search term
  const filteredCatchRecords = useMemo(() => {
    if (!searchTerm) return catchRecords;

    return catchRecords.filter((record) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        record.species?.toLowerCase().includes(searchLower) ||
        record.qr_code?.toLowerCase().includes(searchLower) ||
        record.fish_name?.toLowerCase().includes(searchLower) ||
        record.fish_product_id?.toLowerCase().includes(searchLower) ||
        record.id?.toLowerCase().includes(searchLower)
      );
    });
  }, [catchRecords, searchTerm]);

  // Aggregate tanks from filtered catch records (same logic as 2share-loading.tsx)
  const aggregatedTanks = useMemo(() => {
    const tankMap = new Map<
      number,
      {
        tank: number;
        lastRecord: CatchRecordWithHaul;
        aggregatedStock: number;
        sourceRecordIds: string[];
      }
    >();

    filteredCatchRecords.forEach((record) => {
      const tank = Number(record.tank);
      const stock = Number(record.case_quantity || 0);

      if (stock <= 0) return; // Skip records with no stock

      if (!tankMap.has(tank)) {
        tankMap.set(tank, {
          tank,
          lastRecord: record,
          aggregatedStock: stock,
          sourceRecordIds: [record.id],
        });
      } else {
        const existing = tankMap.get(tank)!;
        existing.aggregatedStock += stock;
        existing.sourceRecordIds.push(record.id);

        // Update to latest record by created_at
        if (
          new Date(record.created_at || 0) >
          new Date(existing.lastRecord.created_at || 0)
        ) {
          existing.lastRecord = record;
        }
      }
    });

    return Array.from(tankMap.values()).sort((a, b) => a.tank - b.tank);
  }, [filteredCatchRecords]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Vessel and Trip Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vessel Selection */}
        <div>
          <label className="font-bold mr-2">Select Vessel:</label>
          <div className="relative vessel-search-container">
            <input
              type="text"
              className="bg-gray-200 px-2 mt-2 rounded-md w-full p-2"
              value={
                selectedVesselId
                  ? vessels.find((v) => v.id === selectedVesselId)?.name || ""
                  : vesselSearchTerm || ""
              }
              onChange={(e) => {
                setVesselSearchTerm(e.target.value);
                setSelectedVesselId(null);
                setShowVesselDropdown(true);
              }}
              onFocus={() => setShowVesselDropdown(true)}
              placeholder="Search vessel by name or registration"
            />

            {showVesselDropdown && vessels.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {(vesselSearchTerm
                  ? vessels.filter(
                      (vessel) =>
                        vessel.name
                          ?.toLowerCase()
                          .includes(vesselSearchTerm.toLowerCase()) ||
                        vessel.registration_number
                          ?.toLowerCase()
                          .includes(vesselSearchTerm.toLowerCase())
                    )
                  : vessels
                ).map((vessel) => (
                  <div
                    key={vessel.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                    onClick={() => {
                      setSelectedVesselId(vessel.id);
                      setShowVesselDropdown(false);
                      setVesselSearchTerm("");
                    }}
                  >
                    <div className="font-medium">{vessel.name}</div>
                    <div className="text-sm text-gray-600">
                      Reg #: {vessel.registration_number}
                      {vessel.type &&
                        ` | Type: ${
                          vessel.type === "mining" ? "Fishing" : vessel.type
                        }`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trip Selection */}
        <div>
          <label className="font-bold mr-2">Select Trip:</label>
          <div className="relative trip-search-container">
            <input
              type="text"
              className="bg-gray-200 px-2 mt-2 rounded-md w-full p-2"
              value={
                selectedTripId
                  ? trips.find((t) => t.id === selectedTripId)?.trip_code || ""
                  : tripSearchTerm || ""
              }
              onChange={(e) => {
                setTripSearchTerm(e.target.value);
                setSelectedTripId(null);
                setShowTripDropdown(true);
              }}
              onFocus={() => setShowTripDropdown(true)}
              placeholder="Search trip by code or status"
            />

            {showTripDropdown &&
              trips.length > 0 &&
              !loading &&
              selectedVesselId && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {(tripSearchTerm
                    ? trips.filter(
                        (trip) =>
                          trip.vessel_id === selectedVesselId &&
                          (trip.trip_code
                            ?.toLowerCase()
                            .includes(tripSearchTerm.toLowerCase()) ||
                            trip.status
                              ?.toLowerCase()
                              .includes(tripSearchTerm.toLowerCase()))
                      )
                    : trips.filter(
                        (trip) => trip.vessel_id === selectedVesselId
                      )
                  ).map((trip) => (
                    <div
                      key={trip.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                      onClick={() => {
                        setSelectedTripId(trip.id);
                        setShowTripDropdown(false);
                        setTripSearchTerm("");
                      }}
                    >
                      <div className="font-medium">
                        Trip Code: {trip.trip_code}
                      </div>
                      <div className="text-sm text-gray-600">
                        Status: {trip.status}
                        {trip.created_at &&
                          ` | Date: ${new Date(
                            trip.created_at
                          ).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by species, QR code, fish name, product ID, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button
            onClick={() => setShowQRScanner(!showQRScanner)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            QR Scan
          </Button>
        </div>
      </div>

      {/* Tank Cards Display */}
      {selectedTripId ? (
        <div className="mb-10">
          {aggregatedTanks.length > 0 &&
            aggregatedTanks.map(
              ({ tank, lastRecord, aggregatedStock, sourceRecordIds }) => {
                const tankKey = `${tank}-${lastRecord.species}-${lastRecord.fish_size}`;
                const uniqueCartItemId = `${selectedVesselId}-${selectedTripId}-tank-${tank}`;
                const isScannedTank =
                  scannedCatchRecord &&
                  scannedCatchRecord.tank === tank &&
                  scannedCatchRecord.species === lastRecord.species &&
                  scannedCatchRecord.fish_size === lastRecord.fish_size;

                return (
                  <div
                    key={`tank-${tank}`}
                    id={`tank-${tankKey}`}
                    className={`border rounded-lg p-3 md:p-4 mb-4 md:mb-6 bg-white shadow flex flex-col md:flex-row relative ${
                      cartStore.isItemInCart(uniqueCartItemId)
                        ? "ring-2 ring-red-500"
                        : ""
                    } ${
                      isScannedTank
                        ? "ring-4 ring-blue-500 bg-blue-50 animate-pulse"
                        : ""
                    }`}
                  >
                    {/* Selection indicator */}
                    {cartStore.isItemInCart(uniqueCartItemId) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-red-500 rounded-full p-1 shadow-md">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Carousel of images */}
                    <div className="mb-3 md:mb-5 md:mb-0 md:mr-4 flex flex-col items-center min-w-[100px] md:min-w-[120px]">
                      <div className="font-bold mb-2 text-sm md:text-base">
                        Tank {tank}
                      </div>
                      <div className="w-32 h-32 md:w-40 md:h-40 overflow-x-auto flex gap-2">
                        {lastRecord.image_url ? (
                          <img
                            src={lastRecord.image_url}
                            alt="Catch"
                            className="w-[100%] h-[100%] object-cover rounded border"
                          />
                        ) : (
                          <div className="w-32 h-32 md:w-40 md:h-40 bg-gray-200 flex items-center justify-center rounded text-gray-400 text-xs md:text-sm">
                            No Image
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <div className="text-xs md:text-sm font-medium">
                          Product name:
                        </div>
                        <Input
                          value={
                            lastRecord.fish_name ||
                            lastRecord.species ||
                            "Unknown"
                          }
                          readOnly
                          className="bg-red-100 px-2 text-xs md:text-sm h-8 md:h-9"
                        />
                        <div className="text-xs md:text-sm font-medium">
                          Size:
                        </div>

                        <div className="flex items-center gap-2 bg-gray-100 pr-2 rounded-md">
                          <Input
                            type="number"
                            value={extractNumberFromFishSize(
                              lastRecord.fish_size
                            )}
                            required
                            className="flex-1 bg-red-100 p-0 text-xs md:text-sm h-8 md:h-9"
                          />
                          <span className="text-red-500 text-xs md:text-sm font-medium">
                            Pcs/kg
                          </span>
                        </div>
                        <div className="text-xs md:text-sm font-medium">
                          Product ID:
                        </div>
                        <Input
                          value={
                            lastRecord.qr_code
                              ? lastRecord.qr_code
                              : typeof lastRecord.haul_id === "object" &&
                                lastRecord.haul_id !== null
                              ? (lastRecord.haul_id as { qr_code: string })
                                  .qr_code
                              : lastRecord.id
                          }
                          readOnly
                          className="bg-red-100 px-2 text-xs md:text-sm h-8 md:h-9"
                        />
                        <div className="text-xs md:text-sm font-medium">
                          Stock:
                        </div>
                        <Input
                          value={aggregatedStock}
                          readOnly
                          className="bg-red-100 px-2 text-xs md:text-sm h-8 md:h-9"
                        />
                      </div>

                      {/* Auction Form */}
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();

                          const formKey = uniqueCartItemId;
                          const quantityLoad =
                            orderForms[formKey]?.quantity_load;
                          const bidPrice = orderForms[formKey]?.bid_price;

                          if (!quantityLoad || !bidPrice) return;

                          const requestedLoad = Number(quantityLoad);
                          const pricePerKg = Number(bidPrice);

                          // Ensure requested load does not exceed aggregated stock
                          if (requestedLoad > aggregatedStock) {
                            toast({
                              title: "Insufficient stock",
                              description: `Requested ${requestedLoad} exceeds available ${aggregatedStock} for tank ${tank}`,
                              variant: "destructive",
                            });
                            return;
                          }

                          // Build deduction logic (same as 2share-loading.tsx)
                          setOrderLoading(true);
                          setOrderError(null);
                          (async () => {
                            try {
                              let remaining = requestedLoad;
                              const groupRecords = filteredCatchRecords
                                .filter(
                                  (cr) =>
                                    Number(cr.tank) === tank &&
                                    Number(cr.case_quantity || 0) > 0
                                )
                                .sort((a, b) => {
                                  const at = new Date(
                                    a.created_at || 0
                                  ).getTime();
                                  const bt = new Date(
                                    b.created_at || 0
                                  ).getTime();
                                  return at - bt;
                                });
                              const deductionOrder = [
                                ...groupRecords,
                              ].reverse();
                              const deductions: {
                                id: string;
                                deducted: number;
                              }[] = [];

                              for (const rec of deductionOrder) {
                                if (remaining <= 0) break;
                                const available = Number(
                                  rec.case_quantity || 0
                                );
                                if (available <= 0) continue;
                                const take = Math.min(available, remaining);
                                deductions.push({ id: rec.id, deducted: take });
                                remaining -= take;
                              }

                              if (remaining > 0) {
                                throw new Error(
                                  "Failed to deduct full requested load"
                                );
                              }

                              // Add item to cart
                              cartStore.addItem({
                                id: uniqueCartItemId,
                                tank: tank,
                                productName:
                                  lastRecord.fish_name ||
                                  lastRecord.species ||
                                  "Unknown",
                                productId:
                                  typeof lastRecord.haul_id === "object" &&
                                  lastRecord.haul_id !== null
                                    ? (
                                        lastRecord.haul_id as {
                                          qr_code: string;
                                        }
                                      ).qr_code
                                    : lastRecord.qr_code || lastRecord.id,
                                size: extractNumberFromFishSize(
                                  lastRecord.fish_size
                                ),
                                stock: aggregatedStock,
                                quantityLoad: requestedLoad,
                                price: pricePerKg,
                                imageUrl: lastRecord.image_url,
                                fishSize: lastRecord.fish_size,
                                sourceRecordIds: deductions.map((d) => d.id),
                                deductions: deductions.map((d) => ({
                                  id: d.id,
                                  amount: d.deducted,
                                })),
                                tripId: selectedTripId || undefined,
                                vesselId: selectedVesselId || undefined,
                              });

                              // Clear form
                              setOrderForms((prev) => ({
                                ...prev,
                                [formKey]: { quantity_load: "", bid_price: "" },
                              }));

                              toast({
                                title: "Added to cart",
                                description: `Tank ${tank} added. Left stock: ${
                                  aggregatedStock - requestedLoad
                                }`,
                                variant: "default",
                              });
                            } catch (err) {
                              setOrderError(
                                err instanceof Error ? err.message : String(err)
                              );
                              toast({
                                title: "Failed to add to cart",
                                description:
                                  err instanceof Error
                                    ? err.message
                                    : String(err),
                                variant: "destructive",
                              });
                            } finally {
                              setOrderLoading(false);
                            }
                          })();
                        }}
                      >
                        <Label className="text-xs md:text-sm">
                          Quantity Bid:
                        </Label>
                        <Input
                          type="number"
                          value={
                            orderForms[uniqueCartItemId]?.quantity_load || ""
                          }
                          onFocus={() => {
                            selectedTankKeyRef.current = uniqueCartItemId;
                          }}
                          onChange={(e) =>
                            setOrderForms((f) => ({
                              ...f,
                              [uniqueCartItemId]: {
                                ...f[uniqueCartItemId],
                                quantity_load: e.target.value,
                              },
                            }))
                          }
                          max={Number(aggregatedStock || 0)}
                          required
                          className="text-xs md:text-sm h-8 md:h-9"
                        />
                        <Label className="text-xs md:text-sm">Bid Price:</Label>

                        <div className="flex items-center gap-2 bg-gray-100 px-2 rounded-md">
                          <Input
                            type="text"
                            value={
                              orderForms[uniqueCartItemId]?.bid_price
                                ? formatNumberWithCommas(
                                    orderForms[uniqueCartItemId].bid_price
                                  )
                                : ""
                            }
                            onFocus={() => {
                              selectedTankKeyRef.current = uniqueCartItemId;
                            }}
                            onChange={(e) => {
                              const inputValue = e.target.value;

                              if (!inputValue.trim()) {
                                setOrderForms((f) => ({
                                  ...f,
                                  [uniqueCartItemId]: {
                                    ...f[uniqueCartItemId],
                                    bid_price: "",
                                  },
                                }));
                                return;
                              }

                              const cleanInput = inputValue.replace(/,/g, "");
                              const processedValue =
                                parseInputValue(cleanInput);

                              setOrderForms((f) => ({
                                ...f,
                                [uniqueCartItemId]: {
                                  ...f[uniqueCartItemId],
                                  bid_price: processedValue,
                                },
                              }));
                            }}
                            placeholder="e.g., 45,000,000 or 1m, 2M, 1b"
                            required
                            className="flex-1 bg-gray-100 p-0 text-xs md:text-sm h-8 md:h-9"
                          />
                          <span className="text-gray-500 text-xs md:text-sm font-medium">
                            VND/kg
                          </span>
                        </div>

                        <Button
                          type="submit"
                          className="bg-red-500 text-white rounded px-3 md:px-4 py-1 mt-2 w-16 md:w-20 text-xs md:text-sm h-8 md:h-9"
                          disabled={
                            orderLoading || Number(aggregatedStock || 0) <= 0
                          }
                        >
                          {orderLoading ? "Adding..." : "Submit"}
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              }
            )}

          {aggregatedTanks.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No catch records found for the selected trip.
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">
              Loading catch records...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Please select a vessel and trip to view available catch records.
        </div>
      )}

      {/* QR Scanner */}
      <AuctionQRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        selectedVesselId={selectedVesselId}
        selectedTripId={selectedTripId}
        onCatchRecordFound={(catchRecord) => {
          // Store the scanned catch record for highlighting
          setScannedCatchRecord(catchRecord);

          // Close the QR scanner
          setShowQRScanner(false);

          // Show success toast
          toast({
            title: "Catch Record Found",
            description: `Found ${catchRecord.species} in Tank ${catchRecord.tank}`,
          });

          // Scroll to the tank card
          const tankKey = `${catchRecord.tank}-${catchRecord.species}-${catchRecord.fish_size}`;
          selectedTankKeyRef.current = tankKey;

          // Scroll to the tank element after a short delay
          setTimeout(() => {
            const tankElement = document.getElementById(`tank-${tankKey}`);
            if (tankElement) {
              tankElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }, 100);
        }}
      />

      {/* Cart Summary Popup */}
      <CartSummaryPopup
        selectedTripId={selectedTripId}
        tripCode={trips.find((t) => t.id === selectedTripId)?.trip_code}
        onCartCleared={() => {
          // Refresh catch records after cart is cleared
          if (selectedTripId) {
            fetchCatchRecordsForTrip(selectedTripId);
          }
        }}
        onSuccess={(qr) => {
          // Open success dialog, show QR, and clear inputs
          setSuccessDialog({ isOpen: true, successQr: qr });
          // Clear Quantity and Price inputs for current tank selection
          const tankKey = selectedTankKeyRef?.current || null;
          if (tankKey) {
            setOrderForms((f) => ({
              ...f,
              [tankKey]: {
                ...f[tankKey],
                quantity_load: "",
                bid_price: "",
                price: "",
              },
            }));
          }
        }}
      />

      {/* Show cart summary button */}
      {showCartSummary && (
        <Dialog open={showCartSummary} onOpenChange={setShowCartSummary}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cart Summary</DialogTitle>
            </DialogHeader>
            <CartSummaryPopup
              selectedTripId={selectedTripId}
              tripCode={trips.find((t) => t.id === selectedTripId)?.trip_code}
              onCartCleared={() => {
                setShowCartSummary(false);
                if (selectedTripId) {
                  fetchCatchRecordsForTrip(selectedTripId);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Success Dialog */}
      <Dialog
        open={successDialog.isOpen}
        onOpenChange={(open) =>
          setSuccessDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit 4Sale Auction</DialogTitle>
          </DialogHeader>
          {successDialog.successQr ? (
            <div className="flex flex-col items-center">
              <div id="success-qr" className="flex flex-col items-center">
                <p className="mb-2">4Sale Auction Success!</p>
                <QRCodeCanvas value={successDialog.successQr} size={180} />
                <p className="mt-2 break-all">{successDialog.successQr}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => {
                    const canvas = document.querySelector(
                      "#success-qr canvas"
                    ) as HTMLCanvasElement | null;
                    if (canvas) {
                      const link = document.createElement("a");
                      link.href = canvas.toDataURL("image/png");
                      link.download = "4sale-auction-qr.png";
                      link.click();
                    }
                  }}
                >
                  Download QR
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Navigate to transactions page filtered by this QR or ID
                    const url = `/processing-plant/transaction?qr=${encodeURIComponent(
                      successDialog.successQr || ""
                    )}`;
                    window.location.href = url;
                  }}
                >
                  Track your 2Share
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Auction() {
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={language === "en" ? "Trade Log" : "Tiếp Thị/ Cần Thu Mua"}
        />
        <TopButtons />
        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          <Link to="/auction-market/auction" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en" ? "Auction Market" : "Đấu Giá"}
              </span>
            </button>
          </Link>

          <Link to="/auction-market/marketing" className="flex-shrink-0">
            <button
              className={`
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40
              `}
            >
              <span className="truncate">
                {language === "en" ? "Trade Log" : "Tiếp Thị/ Cần Thu Mua"}
              </span>
            </button>
          </Link>
        </div>
        <AuctionContainer />
      </SidebarInset>
    </SidebarProvider>
  );
}
