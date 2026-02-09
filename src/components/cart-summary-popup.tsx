import { useEffect, useMemo, useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useAuthStore } from "@/stores/auth-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useShareFlowStore } from "@/stores/share-flow-store";
import { QRCodeCanvas } from "qrcode.react";

// Fix default Leaflet icon paths when using bundlers
const leafletProto = L.Icon.Default.prototype as unknown as Record<
  string,
  unknown
>;
delete (leafletProto as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url
  ).toString(),
  iconUrl: new URL(
    "leaflet/dist/images/marker-icon.png",
    import.meta.url
  ).toString(),
  shadowUrl: new URL(
    "leaflet/dist/images/marker-shadow.png",
    import.meta.url
  ).toString(),
});

// Format number with commas
const formatNumberWithCommas = (value: number | string): string => {
  if (!value) return "0";
  return Number(value).toLocaleString("en-US");
};

interface CartSummaryProps {
  selectedTripId?: string | null;
  tripCode?: string | null;
  toPortId?: string | null;
  ports?: Array<{ id: string; name?: string | null }>;
  onChangeToPort?: (portId: string) => void;
  onCartCleared?: () => void;
  onSuccess?: (qr: string) => void;
  // Success dialog props
  successTitle?: string;
  successMessage?: string;
  downloadFileName?: string;
  trackingUrl?: string;
  trackingButtonText?: string;
}

export function CartSummaryPopup({
  selectedTripId = null,
  tripCode = null,
  toPortId = null,
  ports = [],
  onChangeToPort,
  onCartCleared,
  onSuccess,
  successTitle = "Success",
  successMessage = "Operation completed successfully!",
  downloadFileName = "qr-code.png",
  trackingUrl,
  trackingButtonText = "Track Order",
}: CartSummaryProps) {
  const {
    items,
    getTotalQuantity,
    getTotalPrice,
    removeItem,
    clearCart,
    type,
  } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  // Local state for the "To Port" searchable dropdown
  const [portSearchTerm, setPortSearchTerm] = useState<string>("");
  const [showPortDropdown, setShowPortDropdown] = useState<boolean>(false);
  type BasicVessel = {
    id: string;
    name: string | null;
    registration_number: string | null;
    latitude: string | null;
    longitude: string | null;
    type?: string | null;
    user_id?: string | null;
    port_registry?: string | null;
    current_zone?: string | null;
  };
  type AccessIdRow = { vessel_id: string };
  const [vessels, setVessels] = useState<BasicVessel[]>([]);
  const [currentVessel, setCurrentVessel] = useState<BasicVessel | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<BasicVessel | null>(
    null
  );
  const [selectedDistanceKm, setSelectedDistanceKm] = useState<number | null>(
    null
  );
  const [polylinePoints, setPolylinePoints] = useState<[number, number][]>([]);
  // Success dialog state
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    successQr: string | null;
  }>({ isOpen: false, successQr: null });
  // Share booking flow (global store)
  const {
    open: shareOpen,
    setOpen: setShareOpen,
    startFlow,
    currentVessel: flowCurrentVessel,
    otherVessel: flowOtherVessel,
    distanceKm: flowDistanceKm,
    cartItems: flowCartItems,
    totalQuantity: flowTotalQuantity,
    totalPrice: flowTotalPrice,
    cancelFlow,
    completeFlow,
    resetFlow,
  } = useShareFlowStore();
  const isMobile = useIsMobile();

  // Show popup when items are added to cart
  useEffect(() => {
    if (items.length > 0) {
      setIsVisible(true);
    }
  }, [items.length]);

  // Preload location and vessels eagerly on mount, so map is ready
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoadingMap(true);
        await new Promise<void>((resolve) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (!active) return resolve();
                setUserLocation({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                });
                resolve();
              },
              () => {
                if (!active) return resolve();
                setUserLocation({ latitude: 10.775, longitude: 106.7 });
                resolve();
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          } else {
            setUserLocation({ latitude: 10.775, longitude: 106.7 });
            resolve();
          }
        });

        const { data: allWithCoords } = await supabase
          .from("vessels")
          .select(
            "id,name,registration_number,latitude,longitude,type,user_id,port_registry,current_zone"
          )
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .limit(500);
        const combined = (allWithCoords || []) as BasicVessel[];
        const unique = combined.filter(
          (v, i, self) => i === self.findIndex((x) => x.id === v.id)
        );
        if (active) setVessels(unique);
      } catch (e) {
        console.error("Error preloading vessels:", e);
      } finally {
        if (active) setIsLoadingMap(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Identify current vessel based on authenticated user
  useEffect(() => {
    if (isAuthenticated && user?.auth_id && vessels.length > 0) {
      const mine = vessels.find((v) => v.user_id === user.auth_id) || null;
      setCurrentVessel(mine);
    } else {
      setCurrentVessel(null);
    }
  }, [isAuthenticated, user?.auth_id, vessels]);

  // Derived map center: prefer current vessel, then user geolocation, then fallback
  const mapCenter = useMemo<[number, number]>(() => {
    const cLat = currentVessel?.latitude
      ? parseFloat(currentVessel.latitude)
      : NaN;
    const cLon = currentVessel?.longitude
      ? parseFloat(currentVessel.longitude)
      : NaN;
    if (!Number.isNaN(cLat) && !Number.isNaN(cLon)) {
      return [cLat, cLon];
    }
    if (userLocation) {
      return [userLocation.latitude, userLocation.longitude];
    }
    return [10.775, 106.7];
  }, [currentVessel, userLocation]);

  const toRad = (d: number) => (d * Math.PI) / 180;
  const haversineDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleMarkerClick = (v: BasicVessel) => {
    try {
      setSelectedVessel(v);
      if (!currentVessel || currentVessel.id === v.id) {
        setSelectedDistanceKm(0);
        setPolylinePoints([]);
        return;
      }
      const cLat = currentVessel.latitude
        ? parseFloat(currentVessel.latitude)
        : NaN;
      const cLon = currentVessel.longitude
        ? parseFloat(currentVessel.longitude)
        : NaN;
      const vLat = v.latitude ? parseFloat(v.latitude) : NaN;
      const vLon = v.longitude ? parseFloat(v.longitude) : NaN;
      if (
        Number.isNaN(cLat) ||
        Number.isNaN(cLon) ||
        Number.isNaN(vLat) ||
        Number.isNaN(vLon)
      ) {
        setSelectedDistanceKm(null);
        setPolylinePoints([]);
        return;
      }
      const dist = haversineDistanceKm(cLat, cLon, vLat, vLon);
      setSelectedDistanceKm(dist);
      if (dist > 0) {
        // Ocean-style route: draw dashed deep-blue geodesic line
        setPolylinePoints([
          [cLat, cLon],
          [vLat, vLon],
        ]);
      } else {
        setPolylinePoints([]);
      }
    } catch (err) {
      console.error("Error computing distance:", err);
    }
  };

  const totalQuantity = getTotalQuantity();
  const totalPrice = getTotalPrice();

  const handleSubmitExpand = async () => {
    try {
      setIsExpanded(true);
      // Map already preloaded; avoid reloading spinner
      // setIsLoadingMap(true);

      // Get user location via browser geolocation
      await new Promise<void>((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
              resolve();
            },
            () => {
              // Fallback to a default location (Saigon River)
              setUserLocation({ latitude: 10.775, longitude: 106.7 });
              resolve();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          setUserLocation({ latitude: 10.775, longitude: 106.7 });
          resolve();
        }
      });

      // No-op: vessels preloaded in effect
    } catch (e) {
      console.error("Error initializing map view:", e);
    } finally {
      // setIsLoadingMap(false);
    }
  };

  if (!isVisible || items.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bg-white rounded-lg shadow-lg border border-gray-200 z-[1000] ${
        isExpanded
          ? "inset-0 w-full h-full rounded-none"
          : "bottom-5 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md"
      } ${
        isMobile && !isExpanded ? "max-h-[85vh]" : ""
      } transition-all duration-500 ease-in-out`}
    >
      <div className="p-4 flex justify-between items-center border-b border-gray-200 relative z-[1100]">
        <div className="flex flex-col">
          <h3 className="font-bold text-lg">
            {isExpanded
              ? "Select Vessel in Map"
              : `Selected Items (${items.length})`}
          </h3>
          {isExpanded && (
            <div className="mt-1 text-sm text-gray-700 flex flex-wrap gap-3 items-center">
              <span>
                Total: {formatNumberWithCommas(totalQuantity)} case •{" "}
                {formatNumberWithCommas(totalPrice)} VND
              </span>
              {selectedTripId && (
                <span>Trip: {tripCode || selectedTripId}</span>
              )}
              <div className="flex items-center gap-2 relative">
                <span>To Seaport:</span>
                <div className="relative port-search-container z-[1100]">
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-2 py-1 text-sm mt-1"
                    value={
                      toPortId
                        ? ports.find((p) => p.id === toPortId)?.name || ""
                        : portSearchTerm
                    }
                    onChange={(e) => {
                      setPortSearchTerm(e.target.value);
                      setShowPortDropdown(true);
                      if (toPortId) {
                        onChangeToPort?.("");
                      }
                    }}
                    onFocus={() => setShowPortDropdown(true)}
                    placeholder="Search port by name"
                  />
                  {showPortDropdown && ports.length > 0 && (
                    <div className="absolute z-[10000] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {(portSearchTerm
                        ? ports.filter((port) =>
                            (port.name || "")
                              .toLowerCase()
                              .includes(portSearchTerm.toLowerCase())
                          )
                        : ports
                      ).map((port) => (
                        <div
                          key={port.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => {
                            onChangeToPort?.(port.id);
                            setShowPortDropdown(false);
                            setPortSearchTerm("");
                          }}
                        >
                          <div className="font-medium">
                            {port.name || port.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                // Restore stock for each cart item using its deductions
                for (const item of items) {
                  const deductions = item.deductions || [];
                  for (const d of deductions) {
                    const { data: recs, error: fetchErr } = await supabase
                      .from<
                        Database["public"]["Tables"]["catch_records"]["Row"]
                      >("catch_records")
                      .select("id, case_quantity")
                      .eq("id", d.id)
                      .limit(1);
                    if (fetchErr) continue;
                    const current = Number(
                      (recs?.[0]?.case_quantity as string | null) || 0
                    );
                    const newQty = current + Number(d.amount || 0);
                    await supabase
                      .from<
                        Database["public"]["Tables"]["catch_records"]["Row"]
                      >("catch_records")
                      .update({ case_quantity: String(newQty) })
                      .eq("id", d.id);
                  }
                }
              } finally {
                clearCart();
                // Notify parent to refresh local catchRecords aggregation
                onCartCleared?.();
              }
            }}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            Clear All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              isExpanded ? setIsExpanded(false) : setIsVisible(false)
            }
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </Button>
        </div>
      </div>
      {isExpanded ? (
        <div className="h-[calc(100%-64px)]">
          {isLoadingMap || !userLocation ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-600">Loading map…</div>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={10}
              className="w-full h-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {polylinePoints.length > 1 && (
                <Polyline
                  positions={polylinePoints}
                  pathOptions={{
                    color: "#1E88E5",
                    weight: 3,
                    opacity: 0.9,
                    dashArray: "6 6",
                  }}
                />
              )}

              {/* Custom icons for vessel types */}
              {vessels.map((v) => {
                const lat = v.latitude ? parseFloat(v.latitude) : NaN;
                const lon = v.longitude ? parseFloat(v.longitude) : NaN;
                if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
                const logisticsIcon = L.icon({
                  iconUrl: "/images/icons/isolar.png",
                  iconSize: [40, 80],
                  iconAnchor: [20, 80],
                });
                const miningIcon = L.icon({
                  iconUrl: "/images/icons/itruck.png",
                  iconSize: [60, 120],
                  iconAnchor: [30, 120],
                });
                const icon =
                  v.type === "logistics"
                    ? logisticsIcon
                    : v.type === "mining"
                    ? miningIcon
                    : undefined;
                const isCurrent =
                  isAuthenticated &&
                  user?.auth_id &&
                  v.user_id === user.auth_id;
                const cLat = currentVessel?.latitude
                  ? parseFloat(currentVessel.latitude)
                  : NaN;
                const cLon = currentVessel?.longitude
                  ? parseFloat(currentVessel.longitude)
                  : NaN;
                const canCompute =
                  !Number.isNaN(cLat) &&
                  !Number.isNaN(cLon) &&
                  !Number.isNaN(lat) &&
                  !Number.isNaN(lon);
                const quickDistance =
                  currentVessel && v.id !== currentVessel.id && canCompute
                    ? haversineDistanceKm(cLat, cLon, lat, lon)
                    : null;
                return (
                  <Marker
                    key={v.id}
                    position={[lat, lon]}
                    icon={icon}
                    eventHandlers={{ click: () => handleMarkerClick(v) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">
                          {v.name || "Unnamed Vessel"}
                        </div>
                        <div className="text-gray-600">
                          {v.registration_number || "No Reg."}
                        </div>
                        {isCurrent && (
                          <div className="mt-1 inline-block px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                            Current vessel (You)
                          </div>
                        )}
                        {!isCurrent && (
                          <div className="mt-2 space-y-1">
                            <div>
                              Port Registry: {v.port_registry || "Unknown"}
                            </div>
                            {quickDistance !== null && (
                              <div>
                                Distance from your vessel:{" "}
                                {quickDistance.toFixed(2)} km
                              </div>
                            )}
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  // Compute distance for the share flow
                                  const cLat = currentVessel?.latitude
                                    ? parseFloat(currentVessel.latitude)
                                    : NaN;
                                  const cLon = currentVessel?.longitude
                                    ? parseFloat(currentVessel.longitude)
                                    : NaN;
                                  const vLat = v.latitude
                                    ? parseFloat(v.latitude)
                                    : NaN;
                                  const vLon = v.longitude
                                    ? parseFloat(v.longitude)
                                    : NaN;
                                  const canCompute =
                                    !Number.isNaN(cLat) &&
                                    !Number.isNaN(cLon) &&
                                    !Number.isNaN(vLat) &&
                                    !Number.isNaN(vLon);
                                  const dist = canCompute
                                    ? haversineDistanceKm(
                                        cLat,
                                        cLon,
                                        vLat,
                                        vLon
                                      )
                                    : null;
                                  // Start global share booking flow
                                  startFlow({
                                    currentVessel: currentVessel || null,
                                    otherVessel: v,
                                    distanceKm: dist,
                                    cartItems: items,
                                    totalQuantity,
                                    totalPrice,
                                  });
                                  // Close map only; keep popup visible so dialog mounts
                                  setIsExpanded(false);
                                  setIsVisible(true);
                                  setShareOpen(true);
                                }}
                              >
                                2Share
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>
      ) : (
        !shareOpen && (
          <>
            <div
              className={`${
                isMobile
                  ? "overflow-y-auto max-h-[calc(35vh-120px)]"
                  : "max-h-[300px] overflow-y-auto"
              }`}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border-b border-gray-100 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">Tank {item.tank}</div>
                    <div className="text-sm text-gray-600">
                      {item.productName}
                    </div>
                    <div className="text-sm">
                      ({item.size} kg × {formatNumberWithCommas(item.price)} VND
                      ) × {item.quantityLoad} case
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-right">
                      {formatNumberWithCommas(
                        Number(item.size) * item.price * item.quantityLoad
                      )}{" "}
                      VND
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 h-auto"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 rounded-b-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Total Quantity:</span>
                <span className="font-bold">{totalQuantity} case</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Price:</span>
                <span className="font-bold text-red-600">
                  {formatNumberWithCommas(totalPrice)} VND
                </span>
              </div>
              <div className="flex xs:flex-col md:flex-row justify-between items-center gap-2">
                <Button
                  onClick={async () => {
                    // Persist a single aggregated transaction with items and deduct stock per source record
                    try {
                      // Check if cart has items before processing
                      if (!items || items.length === 0) {
                        console.warn("No items in cart to process");
                        return;
                      }

                      // Build aggregated items payload with explicit typing compatible with JSONB
                      const itemsPayload: Record<string, unknown>[] = items.map(
                        (item) => ({
                          id: item.id,
                          tank: item.tank,
                          productName: item.productName,
                          productId: item.productId,
                          size: item.size,
                          stock: item.stock,
                          quantityLoad: item.quantityLoad,
                          price: item.price,
                          imageUrl: item.imageUrl,
                          fishSize: item.fishSize,
                          sourceRecordIds: item.sourceRecordIds,
                          deductions: item.deductions,
                          tripId: selectedTripId || item.tripId,
                          vesselId: item.vesselId,
                          toPortId: toPortId || item.toPortId,
                        })
                      );

                      const totalQuantity = getTotalQuantity();
                      const totalPrice = getTotalPrice();
                      const unit = "case";
                      const currency = "VND";
                      // Generate formatted transaction ID: PO + ZoneKey + ZoneNumber + ddMMyy + sequence
                      const zoneKey =
                        flowCurrentVessel?.current_zone ||
                        currentVessel?.current_zone ||
                        "Z";
                      const zoneNumberRaw = (flowDistanceKm ??
                        selectedDistanceKm ??
                        0) as number | null;
                      const zoneNumber = String(
                        Math.max(0, Math.round(Number(zoneNumberRaw) || 0))
                      );
                      const now = new Date();
                      const dd = String(now.getDate()).padStart(2, "0");
                      const mm = String(now.getMonth() + 1).padStart(2, "0");
                      const yy = String(now.getFullYear()).slice(-2);
                      const datePart = `${dd}${mm}${yy}`;
                      const startOfDay = new Date(now);
                      startOfDay.setHours(0, 0, 0, 0);
                      const endOfDay = new Date(now);
                      endOfDay.setHours(23, 59, 59, 999);
                      const { count: todayCount } = await supabase
                        .from("vessel_transactions")
                        .select("*", { count: "exact", head: true })
                        .eq("type", "2ShareLoading")
                        .gte("created_at", startOfDay.toISOString())
                        .lte("created_at", endOfDay.toISOString());
                      const sequence = String((todayCount || 0) + 1).padStart(
                        3,
                        "0"
                      );
                      const qr_code = `PA${zoneNumber}${datePart}${sequence}`;

                      // Get trip and seaport information
                      let tripDeparturePort = "";
                      const cLat = currentVessel?.latitude
                        ? parseFloat(currentVessel.latitude)
                        : NaN;
                      const cLon = currentVessel?.longitude
                        ? parseFloat(currentVessel.longitude)
                        : NaN;

                      if (selectedTripId) {
                        const { data: tripData } = await supabase
                          .from("fishing_trips")
                          .select("departure_port")
                          .eq("id", selectedTripId)
                          .single();

                        if (tripData?.departure_port) {
                          tripDeparturePort = tripData.departure_port;
                        }
                      }

                      // Single aggregated insert
                      const insertTx = {
                        auth_id: user.auth_id,
                        tank_number: Number(itemsPayload[0].tank),
                        product_name:
                          (itemsPayload[0].productName as string) || "Unknown",
                        catch_id:
                          itemsPayload[0].sourceRecordIds?.[0] ||
                          itemsPayload[0].productId,
                        catch_record_ids: items.flatMap(
                          (item) => item.sourceRecordIds || [item.productId]
                        ),
                        departure_port: tripDeparturePort,
                        to_port: toPortId as string,
                        zone_dept: zoneKey as string,
                        size: Number(itemsPayload[0].size),
                        quantity_load: Number(totalQuantity || 0),
                        available_load: Number(totalQuantity || 0),
                        stock: Number(totalQuantity || 0),
                        price: Number(totalPrice || 0),
                        bid_price: Number(totalPrice || 0),
                        status: "pending",
                        product_id: qr_code as string,
                        trip_id: selectedTripId || null,
                        type: type, // Use dynamic type from cart store
                        items: itemsPayload,
                        latitude: cLat,
                        longitude: cLon,
                      };

                      const { error: insertErr } = await supabase
                        .from("product_orders")
                        .insert([insertTx]);
                      if (insertErr) throw insertErr;

                      // Deduct stock from catch_records per item deductions
                      for (const item of items) {
                        if (item.deductions && item.deductions.length > 0) {
                          for (const d of item.deductions) {
                            const { data: rec, error: recErr } = await supabase
                              .from("catch_records")
                              .select("case_quantity")
                              .eq("id", d.id)
                              .single();
                            if (!recErr && rec) {
                              const available = Number(
                                (rec?.case_quantity as string | null) || 0
                              );
                              const newQty = Math.max(
                                0,
                                available - Number(d.amount || 0)
                              );
                              await supabase
                                .from("catch_records")
                                .update({ case_quantity: String(newQty) })
                                .eq("id", d.id);
                            }
                          }
                        }
                      }
                      // Clear cart and close popup
                      clearCart();
                      setIsVisible(false);
                      // Trigger refresh for parent if provided
                      if (onCartCleared) {
                        await onCartCleared();
                      }
                      // Notify success for QR dialog display
                      if (onSuccess) {
                        onSuccess(qr_code);
                      } else {
                        // Show internal success dialog
                        setSuccessDialog({ isOpen: true, successQr: qr_code });
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="w-full mt-3 bg-blue-500 hover:bg-red-600 text-white"
                >
                  Confirm
                </Button>
                <Button
                  onClick={handleSubmitExpand}
                  className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white"
                >
                  Transport
                </Button>
              </div>
            </div>
          </>
        )
      )}

      {/* Share Booking Dialog: full-screen, accessible, shows current user/vessel, distance, and selected vessel */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Make 2Share</DialogTitle>
            <DialogDescription>
              Review parties and distance, then confirm your share booking.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 text-sm">
            {/* Current user and vessel */}
            <div className="border rounded p-3">
              <div className="font-semibold mb-1">2Share Vessel</div>
              <div className="mt-2">
                <div>
                  {flowCurrentVessel?.name ||
                    currentVessel?.name ||
                    "Unnamed Vessel"}
                </div>
                <div className="text-gray-600">
                  Reg#:{" "}
                  {flowCurrentVessel?.registration_number ||
                    currentVessel?.registration_number ||
                    "N/A"}
                </div>
                <div className="text-gray-600">
                  Port:{" "}
                  {flowCurrentVessel?.port_registry ||
                    currentVessel?.port_registry ||
                    "Unknown"}{" "}
                  {(() => {
                    const zone =
                      flowCurrentVessel?.current_zone ||
                      currentVessel?.current_zone;
                    return zone ?? "";
                  })()}
                </div>
              </div>
            </div>

            {/* Distance in the middle */}
            <div className="flex items-center justify-center">
              <div className="text-2xl font-bold">
                Distance:{" "}
                {flowDistanceKm !== null && flowDistanceKm !== undefined
                  ? `${flowDistanceKm.toFixed(2)} km`
                  : "N/A"}
              </div>
            </div>

            {/* Selected vessel / other party */}
            <div className="border rounded p-3">
              <div className="font-semibold mb-1">4Share Vessel</div>
              <div>{flowOtherVessel?.name || "Unnamed Vessel"}</div>
              <div className="text-gray-600">
                Reg#: {flowOtherVessel?.registration_number || "N/A"}
              </div>
              <div className="text-gray-600">
                Port: {flowOtherVessel?.port_registry || "Unknown"}{" "}
                {flowOtherVessel?.current_zone
                  ? `${flowOtherVessel.current_zone}`
                  : ""}
              </div>
            </div>

            {/* Cart summary */}
            <div className="border rounded p-3">
              <div className="font-semibold mb-1">Cart Summary</div>
              <div>Items: {flowCartItems.length}</div>
              <div>
                Quantity: {formatNumberWithCommas(flowTotalQuantity)} case
              </div>
              <div>Total: {formatNumberWithCommas(flowTotalPrice)} VND</div>
              <div className="mt-2 max-h-40 overflow-auto border rounded p-2">
                {flowCartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-2 py-1 text-xs"
                  >
                    <span>
                      {item.productName} • Tank {item.tank} • Size {item.size}
                    </span>
                    <span>
                      Qty {item.quantityLoad} • Price{" "}
                      {formatNumberWithCommas(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  cancelFlow();
                  setShareOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  // Persist a single aggregated transaction with items and deduct stock per source record
                  try {
                    const sellerVesselId =
                      flowCurrentVessel?.id || currentVessel?.id || null;
                    const buyerVesselId = flowOtherVessel?.id || null;
                    if (!sellerVesselId || !buyerVesselId) {
                      throw new Error("Missing seller or buyer vessel");
                    }
                    // Build aggregated items payload with explicit typing compatible with JSONB
                    const itemsPayload: Record<string, unknown>[] =
                      flowCartItems.map((item) => ({
                        id: item.id,
                        tank: item.tank,
                        productName: item.productName,
                        productId: item.productId,
                        size: item.size,
                        stock: item.stock,
                        quantityLoad: item.quantityLoad,
                        price: item.price,
                        imageUrl: item.imageUrl,
                        fishSize: item.fishSize,
                        sourceRecordIds: item.sourceRecordIds,
                        deductions: item.deductions,
                        tripId: selectedTripId || item.tripId,
                        vesselId: item.vesselId || sellerVesselId,
                        toPortId: toPortId || item.toPortId,
                      }));

                    const totalQuantity = flowTotalQuantity;
                    const totalPrice = flowTotalPrice;
                    const unit = "case";
                    const currency = "VND";
                    // Generate formatted transaction ID: PO + ZoneKey + ZoneNumber + ddMMyy + sequence
                    const zoneKey =
                      flowCurrentVessel?.current_zone ||
                      currentVessel?.current_zone ||
                      "Z";
                    const zoneNumberRaw = (flowDistanceKm ??
                      selectedDistanceKm ??
                      0) as number | null;
                    const zoneNumber = String(
                      Math.max(0, Math.round(Number(zoneNumberRaw) || 0))
                    );
                    const now = new Date();
                    const dd = String(now.getDate()).padStart(2, "0");
                    const mm = String(now.getMonth() + 1).padStart(2, "0");
                    const yy = String(now.getFullYear()).slice(-2);
                    const datePart = `${dd}${mm}${yy}`;
                    const startOfDay = new Date(now);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(now);
                    endOfDay.setHours(23, 59, 59, 999);
                    const { count: todayCount } = await supabase
                      .from<
                        Database["public"]["Tables"]["vessel_transactions"]["Row"]
                      >("vessel_transactions")
                      .select("*", { count: "exact", head: true })
                      .eq("type", "2ShareLoading")
                      .gte("transaction_date", startOfDay.toISOString())
                      .lte("transaction_date", endOfDay.toISOString());
                    const sequence = String((todayCount || 0) + 1).padStart(
                      3,
                      "0"
                    );
                    const qr_code = `PO${zoneNumber}${datePart}${sequence}`;

                    // Single aggregated insert
                    const insertTx: Database["public"]["Tables"]["vessel_transactions"]["Insert"] =
                      {
                        seller_vessel_id: sellerVesselId,
                        buyer_vessel_id: buyerVesselId,
                        catch_record_id: null,
                        quantity: Number(totalQuantity || 0),
                        unit,
                        price: Number(totalPrice || 0),
                        currency,
                        status: "pending",
                        qr_code,
                        transaction_date: new Date().toISOString(),
                        trip_id: selectedTripId || null,
                        type: "2ShareLoading",
                        items: itemsPayload as unknown as any,
                      };

                    const { error: insertErr } = await supabase
                      .from<
                        Database["public"]["Tables"]["vessel_transactions"]["Insert"]
                      >("vessel_transactions")
                      .insert([insertTx]);
                    if (insertErr) throw insertErr;

                    // Deduct stock from catch_records per item deductions
                    for (const item of flowCartItems) {
                      if (item.deductions && item.deductions.length > 0) {
                        for (const d of item.deductions) {
                          const { data: rec, error: recErr } = await supabase
                            .from<
                              Database["public"]["Tables"]["catch_records"]["Row"]
                            >("catch_records")
                            .select("case_quantity")
                            .eq("id", d.id)
                            .single();
                          if (!recErr && rec) {
                            const available = Number(
                              (rec?.case_quantity as string | null) || 0
                            );
                            const newQty = Math.max(
                              0,
                              available - Number(d.amount || 0)
                            );
                            await supabase
                              .from<
                                Database["public"]["Tables"]["catch_records"]["Row"]
                              >("catch_records")
                              .update({ case_quantity: String(newQty) })
                              .eq("id", d.id);
                          }
                        }
                      }
                    }
                    // Clear cart and reset flow
                    clearCart();
                    resetFlow();
                    setShareOpen(false);
                    // Trigger refresh for parent if provided
                    if (onCartCleared) {
                      await onCartCleared();
                    }
                    // Notify success for QR dialog display
                    if (onSuccess) {
                      onSuccess(qr_code);
                    } else {
                      // Show internal success dialog
                      setSuccessDialog({ isOpen: true, successQr: qr_code });
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirm 2Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={successDialog.isOpen}
        onOpenChange={(open) =>
          setSuccessDialog({ isOpen: open, successQr: successDialog.successQr })
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{successTitle}</DialogTitle>
            <DialogDescription>{successMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {successDialog.successQr && (
              <div className="bg-white p-4 rounded-lg">
                <QRCodeCanvas
                  value={successDialog.successQr}
                  size={200}
                  level="M"
                />
              </div>
            )}
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  if (successDialog.successQr) {
                    const canvas = document.querySelector(
                      "canvas"
                    ) as HTMLCanvasElement;
                    if (canvas) {
                      const url = canvas.toDataURL();
                      const link = document.createElement("a");
                      link.download = downloadFileName;
                      link.href = url;
                      link.click();
                    }
                  }
                }}
                variant="outline"
              >
                Download QR
              </Button>
              {trackingUrl && (
                <Button
                  onClick={() => {
                    if (trackingUrl) {
                      window.open(trackingUrl, "_blank");
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {trackingButtonText}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
