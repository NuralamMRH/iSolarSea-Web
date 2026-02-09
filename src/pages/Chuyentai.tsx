import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

import { Button } from "@/components/ui/button";
import { PageHeroHeader } from "@/components/PageHeroHeader";
import { useTranslation } from "@/hooks/use-translation";
import gsap from "gsap";
import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";

import CarouselUl from "@/components/ui/carousel-ul";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { uniq } from "lodash";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OpenSeaMapView from "@/components/OpenSeaMapView";
import { MapPin } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Input } from "@/components/ui/input";
import LoginContainer from "@/components/LoginContainer";

interface ProductOrder {
  id: string;
  trip_id: string;
  tank_number: number;
  product_name: string;
  product_id: string;
  size: number;
  stock: number;
  type: string;
  quantity_load?: number;
  available_load?: number;
  price?: number;
  bid_price?: number;
  departure_date?: string;
  arrival_date?: string;
  created_at?: string;
  catch_id?: string; // Changed from string[] to string
  departure_port?: string; // Add this line
  to_port?: string;
}
// Add types for vessel and product order with images (top-level)
interface ProductOrderWithImages extends ProductOrder {
  images: string[];
}
interface VesselWithOrders {
  vessel: Database["public"]["Tables"]["vessels"]["Row"];
  vesselTrips: Database["public"]["Tables"]["fishing_trips"]["Row"][];
  productOrders: ProductOrderWithImages[];
  user?: Database["public"]["Tables"]["users"]["Row"] | null;
  crewMembers?: Database["public"]["Tables"]["crew_members"]["Row"][];
  gps?: { latitude: number | null; longitude: number | null } | null;
}

type VesselRecord = {
  id: string;
  vessel_id: string;
  type: string;
  trip_id: string;
  latitude: number | null;
  longitude: number | null;
  zone: string;
  total_volume: number;
  vessel_name: string;
  registration_number: string;
};

const REGION_CODES = ["A", "B", "C", "D"];
const Chuyentai = () => {
  const { t } = useTranslation();
  const [ports, setPorts] = useState<
    Database["public"]["Tables"]["seaports"]["Row"][]
  >([]);
  const [portSearch, setPortSearch] = useState("");
  const [selectedPortId, setSelectedPortId] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const box1Ref = useRef<HTMLDivElement | null>(null);
  const box2Ref = useRef<HTMLDivElement | null>(null);
  const areaRefs = useRef<Array<HTMLDivElement | null>>([]);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Demo data for when no real data is found
  const sliderItems = [
    {
      image: "/images/top/number6.jpg",
      productName: t("marketPage.product_sample_name"),
      size: "",
      productCode: "Block-C Code",
      weight: "12",
      quantityLeft: "150",
      startPrice: "70.000",
      currentPrice: "68.000",
    },
    {
      image: "/images/top/number6.jpg",
      productName: t("marketPage.product_sample_name"),
      size: "",
      productCode: "Block-C Code",
      weight: "12",
      quantityLeft: "150",
      startPrice: "70.000",
      currentPrice: "68.000",
    },
    {
      image: "/images/top/number6.jpg",
      productName: t("marketPage.product_sample_name"),
      size: "",
      productCode: "Block-C Code",
      weight: "12",
      quantityLeft: "150",
      startPrice: "70.000",
      currentPrice: "68.000",
    },
    {
      image: "/images/top/number6.jpg",
      productName: t("marketPage.product_sample_name"),
      size: "",
      productCode: "Block-C Code",
      weight: "12",
      quantityLeft: "150",
      startPrice: "70.000",
      currentPrice: "68.000",
    },
  ];

  // Helper function to extract number from fish_size
  function extractNumberFromFishSize(fishSize: string | null): number {
    if (!fishSize) return 0;
    const match = fishSize.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  // Function to get highest bid price for a catch record
  const getHighestBidPrice = async (
    catchRecordId: string
  ): Promise<number | null> => {
    try {
      const { data, error } = await supabase
        .from("vessel_transactions")
        .select("price")
        .eq("catch_record_id", catchRecordId)
        .not("price", "is", null)
        .order("price", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching highest bid:", error);
        return null;
      }

      return data && data.length > 0 ? data[0].price : null;
    } catch (error) {
      console.error("Error fetching highest bid:", error);
      return null;
    }
  };

  // State to store highest bid prices
  const [highestBids, setHighestBids] = useState<Record<string, number | null>>(
    {}
  );

  // Function to fetch highest bids for all product orders
  const fetchHighestBids = async (productOrders: ProductOrderWithImages[]) => {
    const bids: Record<string, number | null> = {};
    for (const order of productOrders) {
      if (order.catch_id) {
        bids[order.id] = await getHighestBidPrice(order.catch_id);
      }
    }
    setHighestBids(bids);
  };

  const REGION_CODES = ["A", "B", "C", "D"];

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  // if (!isAuthenticated) {
  //   navigate("/login");
  // }

  // Helper function to get port name by UUID
  const getPortNameById = (portId: string | undefined): string => {
    if (!portId) return "Unknown Port";
    const port = ports.find((p) => p.id === portId);
    return port?.name || "Unknown Port";
  };

  useEffect(() => {
    fetchPorts();
    // eslint-disable-next-line
  }, []);

  async function fetchPorts(searchTerm = "") {
    setLoading(true);
    try {
      let query = supabase.from("seaports").select("*");
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching ports:", error, error.stack);
        throw error;
      }
      setPorts(data || []);
    } catch (e: unknown) {
      console.error("Exception in fetchPorts:", e);
    } finally {
      setLoading(false);
    }
  }

  // Add type for product order with details
  interface ProductOrderWithDetails extends ProductOrder {
    vessel: Database["public"]["Tables"]["vessels"]["Row"] | null;
    gps: { latitude: number | null; longitude: number | null } | null;
    region: string;
  }
  const [regionProducts, setRegionProducts] = useState<
    Record<string, VesselWithOrders[]>
  >({});
  const [mapDialog, setMapDialog] = useState<{
    isOpen: boolean;
    latitude: number | null;
    longitude: number | null;
    vesselName: string;
  }>({
    isOpen: false,
    latitude: null,
    longitude: null,
    vesselName: "",
  });
  const [regionLoading, setRegionLoading] = useState(false);
  const [regionError, setRegionError] = useState<string | null>(null);

  const [auctionDialog, setAuctionDialog] = useState<{
    isOpen: boolean;
    vessel: VesselWithOrders | null;
    productOrder: ProductOrderWithImages | null;
    successQr: string | null;
  }>({
    isOpen: false,
    vessel: null,
    productOrder: null,
    successQr: null,
  });

  // Function to download QR code as image
  const downloadQRCode = () => {
    const qrElement = document.getElementById("success-qr");
    if (!qrElement) {
      console.error("QR code element not found");
      return;
    }

    // Create a canvas element
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    // Set canvas size
    canvas.width = 400;
    canvas.height = 500;

    // Set background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add title
    ctx.fillStyle = "black";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Chuyển tải thành công!", canvas.width / 2, 40);

    // Get the QR code canvas
    const qrCanvas = qrElement.querySelector("canvas");
    if (qrCanvas) {
      // Draw QR code in the center
      const qrSize = 200;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 80;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // Add QR code text below
      ctx.font = "14px Arial";
      ctx.fillStyle = "#666";
      ctx.fillText(
        auctionDialog.successQr || "",
        canvas.width / 2,
        qrY + qrSize + 30
      );
    }

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `qr-code-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }, "image/png");
  };

  useEffect(() => {
    const fetchRegionProducts = async () => {
      setRegionLoading(true);
      setRegionError(null);
      try {
        // Debug: Check all product orders in the database
        const { data: debugAllProductOrders, error: allOrdersError } =
          await supabase
            .from("product_orders")
            .select("id, type, trip_id, stock, quantity_load, available_load")
            .limit(20);

        if (allOrdersError) {
          console.error("Error fetching all product orders:", allOrdersError);
        } else {
          console.log("All product orders in database:", debugAllProductOrders);
          console.log("Product order types found:", [
            ...new Set(debugAllProductOrders?.map((o) => o.type) || []),
          ]);
        }

        // Debug: Check current user context
        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();
        console.log("Current user context:", currentUser);
        console.log("User error:", userError);

        // Debug: Check if we're authenticated
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        console.log("Current session:", session);
        console.log("Session error:", sessionError);

        // Debug: Test RLS bypass - try to get product orders without any filters
        const { data: testAllOrders, error: testError } = await supabase
          .from("product_orders")
          .select("*")
          .limit(5);

        console.log("Test - All product orders (no filters):", testAllOrders);
        console.log("Test error:", testError);

        // Debug: Test with specific type filter
        const { data: test4ShareOrders, error: test4ShareError } =
          await supabase
            .from("product_orders")
            .select("*")
            .eq("type", "4ShareLoading")
            .limit(5);

        console.log("Test - 4ShareLoading orders:", test4ShareOrders);
        console.log("Test 4Share error:", test4ShareError);

        // 1. Fetch all fishing_trips with departure_port and vessel info
        const { data: trips, error: tripsError } = await supabase
          .from("fishing_trips")
          .select(`*, vessels(*)`);
        if (tripsError) {
          console.error("Error fetching fishing_trips:", tripsError);
          throw tripsError;
        }

        console.log("Total trips fetched:", trips?.length || 0);
        console.log(
          "Sample departure_port values:",
          trips?.slice(0, 5).map((t) => t.departure_port)
        );

        // 2. For each region, collect all unique vessels with trips in that region
        const regionVessels: Record<string, VesselWithOrders[]> = {};
        for (const code of REGION_CODES) {
          // Get ports for this region
          const regionPorts = ports.filter(
            (port) =>
              port.name &&
              (port.name.trim().toUpperCase().startsWith(code) ||
                port.name
                  .trim()
                  .toUpperCase()
                  .includes(code + "."))
          );

          console.log(`Region ${code}: ${regionPorts.length} ports found`);
          if (regionPorts.length > 0) {
            console.log(
              `Region ${code}: Port names:`,
              regionPorts.map((p) => p.name)
            );
          }

          // Get port IDs for this region
          const regionPortIds = regionPorts.map((port) => port.id);

          // Trips in this region (filtered by departure_port)
          const regionTrips = (trips || []).filter(
            (trip) =>
              trip.departure_port && regionPortIds.includes(trip.departure_port)
          );

          console.log(`Region ${code}: ${regionTrips.length} trips found`);
          if (regionTrips.length > 0) {
            console.log(
              `Region ${code}: Sample departure_port values:`,
              regionTrips.slice(0, 3).map((t) => t.departure_port)
            );
          }

          // Unique vessels in this region
          const vesselMap: Record<string, VesselWithOrders> = {};
          for (const trip of regionTrips) {
            if (!trip.vessel_id) continue;
            if (!vesselMap[trip.vessel_id]) {
              vesselMap[trip.vessel_id] = {
                vessel: trip.vessels,
                vesselTrips: [],
                productOrders: [],
                user: null,
                crewMembers: [],
              };
            }
            vesselMap[trip.vessel_id].vesselTrips.push(trip);
          }

          console.log(
            `Region ${code}: ${
              Object.keys(vesselMap).length
            } unique vessels found`
          );

          // For each vessel, fetch product_orders for all its trips in this region
          for (const vesselId in vesselMap) {
            const vesselTrips = vesselMap[vesselId].vesselTrips;
            const tripIds = vesselTrips.map((t) => t.id);
            if (tripIds.length === 0) continue;

            console.log(`Vessel ${vesselId}: Trip IDs:`, tripIds);

            // Get product orders with type "4ShareLoading" and sufficient stock
            const { data: shareOrders, error: shareError } = await supabase
              .from("product_orders")
              .select("*")
              .in("trip_id", tripIds)
              .eq("type", "4ShareLoading");

            if (shareError) {
              console.error(
                `Error fetching product orders for vessel ${vesselId}:`,
                shareError
              );
              throw shareError;
            }

            console.log(
              `Vessel ${vesselId}: Found ${
                shareOrders?.length || 0
              } share loading orders`
            );

            // Let's also check what types of product orders exist for these trips
            const { data: debugAllOrdersForTrips, error: allOrdersError } =
              await supabase
                .from("product_orders")
                .select(
                  "id, type, trip_id, stock, quantity_load, available_load"
                )
                .in("trip_id", tripIds);

            if (allOrdersError) {
              console.error(
                `Error fetching all product orders for vessel ${vesselId}:`,
                allOrdersError
              );
            } else {
              console.log(
                `Vessel ${vesselId}: All product order types:`,
                debugAllOrdersForTrips?.map((o) => o.type)
              );
              console.log(
                `Vessel ${vesselId}: All product orders:`,
                debugAllOrdersForTrips
              );
            }

            // Filter for sufficient stock
            const orders = (shareOrders || []).filter(
              (order) =>
                (order.stock && order.stock > 0) ||
                (order.quantity_load && order.quantity_load > 0) ||
                (order.available_load && order.available_load > 0)
            );

            console.log(
              `Vessel ${vesselId}: After stock filter: ${orders.length} orders`
            );

            // For each product_order, fetch all catch_record images
            const productOrdersWithImages: ProductOrderWithImages[] =
              await Promise.all(
                (orders || []).map(async (order: ProductOrder) => {
                  let images: string[] = [];
                  if (order.catch_id) {
                    const { data: catchRecords, error: catchError } =
                      await supabase
                        .from("catch_records")
                        .select("*")
                        .eq("id", order.catch_id);
                    if (catchError) {
                      console.error(
                        "Error fetching catch_records:",
                        catchError
                      );
                    }
                    if (catchRecords) {
                      images = catchRecords
                        .map((cr: { image_url: string }) => cr.image_url)
                        .filter(Boolean);
                    }
                  }
                  return { ...order, images };
                })
              );

            vesselMap[vesselId].productOrders = productOrdersWithImages;

            // Fetch user info for vessel
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("*")
              .eq("auth_id", vesselMap[vesselId].vessel.user_id)
              .maybeSingle();
            if (userError) {
              console.error("Error fetching user for vessel:", userError);
            }
            vesselMap[vesselId].user = userData || null;

            // Fetch crew members for vessel
            const { data: crewData, error: crewError } = await supabase
              .from("crew_members")
              .select("*")
              .eq("vessel_id", vesselMap[vesselId].vessel.id);
            if (crewError) {
              console.error("Error fetching crew for vessel:", crewError);
            }
            vesselMap[vesselId].crewMembers = crewData || [];

            // Fetch GPS for vessel
            let gps: {
              latitude: number | null;
              longitude: number | null;
            } | null = null;

            // Try vessel_locations first
            const { data: vesselLocs } = await supabase
              .from("vessel_locations")
              .select("latitude,longitude,timestamp")
              .eq("vessel_id", vesselId)
              .order("timestamp", { ascending: false })
              .limit(1);

            if (vesselLocs && vesselLocs.length > 0) {
              gps = {
                latitude: vesselLocs[0].latitude,
                longitude: vesselLocs[0].longitude,
              };
            } else {
              // Fallback: get latest catch_record for this vessel
              const vesselTrips = vesselMap[vesselId].vesselTrips;
              const tripIds = vesselTrips.map((t) => t.id);
              if (tripIds.length > 0) {
                const { data: hauls } = await supabase
                  .from("fishing_hauls")
                  .select("id")
                  .in("trip_id", tripIds);
                const haulIds = (hauls || []).map((h: { id: string }) => h.id);
                if (haulIds.length > 0) {
                  const { data: catchRec } = await supabase
                    .from("catch_records")
                    .select("latitude,longitude,created_at")
                    .in("haul_id", haulIds)
                    .order("created_at", { ascending: false })
                    .limit(1);
                  if (catchRec && catchRec.length > 0) {
                    gps = {
                      latitude: catchRec[0].latitude,
                      longitude: catchRec[0].longitude,
                    };
                  }
                }
              }
            }
            vesselMap[vesselId].gps = gps;
          }

          // Include ALL vessels in this region, even if they don't have product orders
          regionVessels[code] = Object.values(vesselMap);

          console.log(
            `Region ${code}: ${regionVessels[code].length} vessels total`
          );
        }

        setRegionProducts(regionVessels);

        // Fetch highest bids for all product orders
        const allProductOrders = Object.values(regionVessels).flatMap(
          (vessels) => vessels.flatMap((vessel) => vessel.productOrders)
        );
        await fetchHighestBids(allProductOrders);
      } catch (e: unknown) {
        console.error("Error in data fetching:", e);
        setRegionError(e instanceof Error ? e.message : String(e));
      } finally {
        setRegionLoading(false);
      }
    };

    // Only fetch data if ports are loaded
    if (ports.length > 0) {
      fetchRegionProducts();
    }
  }, [ports]);

  // Memoized filtered region products by selected port and region
  const filteredRegionProducts = useMemo(() => {
    // Group vessels by region
    const regionVessels: Record<string, VesselWithOrders[]> = {};

    // Initialize all regions
    REGION_CODES.forEach((code) => {
      regionVessels[code] = [];
    });

    // Get all vessels from all regions if 'All Regions' is selected, or from specific region
    let vessels: VesselWithOrders[] = [];
    if (!selectedRegion) {
      vessels = Object.values(regionProducts).flat();
    } else {
      vessels = regionProducts[selectedRegion] || [];
    }

    // Group vessels by their region
    vessels.forEach((vessel) => {
      // Determine region based on vessel's trips
      const vesselRegion =
        vessel.vesselTrips.length > 0
          ? vessel.vesselTrips[0].to_region?.charAt(0) || "A"
          : "A";

      if (regionVessels[vesselRegion]) {
        regionVessels[vesselRegion].push(vessel);
      }
    });

    return regionVessels;
  }, [regionProducts, selectedRegion]);

  const portFilteredVesselIds = useMemo(() => {
    if (!selectedPortId) return new Set<string>();
    const allVessels = Object.values(filteredRegionProducts).flat();
    return new Set(
      allVessels
        .filter((vessel) =>
          vessel.vesselTrips.some(
            (trip) => trip.departure_port === selectedPortId
          )
        )
        .map((vessel) => vessel.vessel.id)
    );
  }, [filteredRegionProducts, selectedPortId]);

  useEffect(() => {
    if (heroRef.current) {
      gsap.from(heroRef.current, {
        opacity: 0,
        y: 60,
        duration: 1,
        ease: "power2.out",
      });
    }
    if (box1Ref.current) {
      gsap.from(box1Ref.current, {
        opacity: 0,
        y: 50,
        duration: 1,
        ease: "power2.out",
      });
    }
    if (box2Ref.current) {
      gsap.from(box2Ref.current, {
        opacity: 0,
        y: 50,
        duration: 1,
        delay: 0.3,
        ease: "power2.out",
      });
    }
    if (areaRefs.current) {
      areaRefs.current.forEach((el, i) => {
        if (el) {
          gsap.from(el, {
            opacity: 0,
            y: 40,
            duration: 0.8,
            delay: 0.5 + i * 0.2,
            ease: "power2.out",
          });
        }
      });
    }
  }, []);

  const handleGPSClick = (record: VesselRecord) => {
    if (record.latitude && record.longitude) {
      setMapDialog({
        isOpen: true,
        latitude: record.latitude,
        longitude: record.longitude,
        vesselName: record.vessel_name,
      });
    }
  };

  return (
    <div id="wrapper" className="flex flex-col min-h-screen">
      <Header />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main id="main" className="main">
            <div ref={heroRef}>
              <PageHeroHeader
                heading={t("chuyentaiPage.heading")}
                breadcrumbHome={t("chuyentaiPage.breadcrumb_home")}
                breadcrumbCurrent={t("chuyentaiPage.breadcrumb_current")}
              />
            </div>

            {/* end tt-page */}
            <div className="market">
              <div className="market__box1" ref={box1Ref}>
                <div className="container">
                  <h2 className="c-title-1">
                    <span className="c-title-1__stroke">
                      {t("chuyentaiPage.supply_zone")}
                    </span>
                    <br className="show_sp" />
                    <span className="c-title-1__gradient">
                      {t("chuyentaiPage.supply_zone_sub")}
                    </span>
                  </h2>
                  <div className="c-border"></div>
                  <div className="market__content bg-white">
                    <div className="market__left">
                      <img
                        src="/images/top/chuyentai.png"
                        alt={t("chuyentaiPage.img_alt1")}
                      />
                    </div>
                    <div className="market__map">
                      <img
                        src="/images/top/thumua2.png"
                        alt={t("chuyentaiPage.map_alt")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="market__box2" ref={box2Ref}>
                <div className="container">
                  <h2 className="c-title-1">
                    <span className="c-title-1__stroke">
                      {t("chuyentaiPage.chanh")}
                    </span>
                    <span className="c-title-1__gradient">
                      {t("chuyentaiPage.nhan_tai")}
                      <br />
                      iBoat4Share
                    </span>
                  </h2>

                  {regionLoading ? (
                    <div className="space-y-8">
                      {/* Skeleton Area Cards */}
                      {Array.from({ length: 3 }).map((_, areaIdx) => (
                        <motion.div
                          key={areaIdx}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: areaIdx * 0.2 }}
                          className="market__big-area"
                        >
                          <div className="c-border"></div>
                          <div className="moving__heading">
                            <div className="moving__from">
                              <motion.div
                                className="h-6 bg-gray-200 rounded animate-pulse mb-2"
                                initial={{ width: "30%" }}
                                animate={{ width: ["30%", "50%", "30%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                className="h-8 bg-gray-200 rounded animate-pulse"
                                initial={{ width: "60%" }}
                                animate={{ width: ["60%", "80%", "60%"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            </div>
                            <motion.div
                              className="h-8 bg-gray-200 rounded animate-pulse max-w-[100px]"
                              initial={{ width: "80%" }}
                              animate={{ width: ["80%", "100%", "80%"] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </div>
                          <div className="market__box2-wrap">
                            <div className="market__box2-price">
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                                className="c-title-5"
                              >
                                <motion.div
                                  className="h-6 bg-gray-200 rounded animate-pulse"
                                  initial={{ width: "50%" }}
                                  animate={{ width: ["50%", "70%", "50%"] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              </motion.div>
                              <div className="market__box2-spilit">
                                <div className="market__box2-fixed">
                                  <ul>
                                    {Array.from({ length: 8 }).map(
                                      (_, headerIdx) => (
                                        <li key={headerIdx}>
                                          <motion.div
                                            className="h-4 bg-gray-200 rounded animate-pulse"
                                            initial={{ width: "60%" }}
                                            animate={{
                                              width: ["60%", "80%", "60%"],
                                            }}
                                            transition={{
                                              duration: 2,
                                              repeat: Infinity,
                                              delay: headerIdx * 0.1,
                                            }}
                                          />
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                                <div className="market__box2-slider">
                                  <CarouselUl>
                                    {Array.from({ length: 2 }).map(
                                      (_, productIdx) => (
                                        <motion.ul
                                          key={productIdx}
                                          initial={{ opacity: 0, x: 20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{
                                            duration: 0.4,
                                            delay: productIdx * 0.1,
                                          }}
                                          className="market__box2-item px-4"
                                        >
                                          {Array.from({ length: 8 }).map(
                                            (_, itemIdx) => (
                                              <li key={itemIdx}>
                                                <motion.div
                                                  className="h-6 bg-gray-200 rounded animate-pulse"
                                                  initial={{ width: "70%" }}
                                                  animate={{
                                                    width: [
                                                      "70%",
                                                      "90%",
                                                      "70%",
                                                    ],
                                                  }}
                                                  transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    delay: itemIdx * 0.1,
                                                  }}
                                                />
                                              </li>
                                            )
                                          )}
                                        </motion.ul>
                                      )
                                    )}
                                  </CarouselUl>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="c-border"></div>
                        </motion.div>
                      ))}
                    </div>
                  ) : Object.values(filteredRegionProducts).every(
                      (vessels) => !vessels || vessels.length === 0
                    ) ? (
                    // Show demo cards when no data is found
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="market__big-area"
                    >
                      <div className="c-border"></div>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="moving__heading"
                      >
                        <div className="moving__from">
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="moving__from-title"
                          >
                            Demo Market Data
                          </motion.p>
                        </div>
                      </motion.div>
                      <div className="market__box2-wrap">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          className="market__box2-info"
                        >
                          <motion.h4
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="c-title-5"
                          >
                            Demo Vessel
                          </motion.h4>
                          <div className="form-wrap">
                            <div className="form-group">
                              <label>{t("marketPage.vessel_id")}</label>
                              <input
                                readOnly
                                type="text"
                                name="vessel_id"
                                value="DEMO-001"
                                disabled
                              />
                            </div>
                            <div className="form-group">
                              <label>{t("marketPage.trip_id")}</label>
                              <input
                                readOnly
                                type="text"
                                name="trip_id"
                                value="DEMO-TRIP-001"
                                disabled
                              />
                            </div>
                            <div className="form-group">
                              <label>{t("marketPage.captain_name")}</label>
                              <input
                                readOnly
                                type="text"
                                name="captain_name"
                                value="Demo Captain"
                                disabled
                              />
                            </div>
                            <div className="form-group">
                              <label>{t("marketPage.contact")}</label>
                              <input
                                readOnly
                                type="text"
                                name="contact"
                                value="demo@example.com"
                                disabled
                              />
                            </div>
                            <div className="form-group">
                              <label>{t("marketPage.gps")}</label>
                              <span className="text-gray-400">No GPS data</span>
                            </div>
                            <div className="form-group">
                              <label>{t("marketPage.zone")}</label>
                              <input
                                readOnly
                                type="text"
                                name="zone"
                                value="EC(X..)"
                                disabled
                              />
                            </div>
                          </div>
                          <div className="market__box2-price">
                            <motion.h4
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.2 }}
                              className="c-title-5"
                            >
                              {t("marketPage.product_auction")}
                            </motion.h4>
                            <div className="market__box2-spilit">
                              <div className="market__box2-fixed">
                                <ul>
                                  <li className="market__photo">
                                    {t("marketPage.image")}
                                  </li>
                                  <li>{t("marketPage.product_name")}</li>
                                  <li>{t("marketPage.size")}</li>
                                  <li>{t("marketPage.product_code")}</li>
                                  <li>{t("marketPage.weight")}</li>
                                  <li>{t("marketPage.quantity_left")}</li>
                                  <li>{t("marketPage.start_price")}</li>
                                  <li>{t("marketPage.current_price")}</li>
                                  <li></li>
                                  <li></li>
                                </ul>
                              </div>
                              <div className="market__box2-slider">
                                <CarouselUl>
                                  {sliderItems.map((item, itemIdx) => (
                                    <motion.ul
                                      key={itemIdx}
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{
                                        duration: 0.4,
                                        delay: itemIdx * 0.1,
                                      }}
                                      className="market__box2-item px-4"
                                    >
                                      <li className="market__photo">
                                        <img
                                          src={item.image}
                                          alt={item.productName}
                                          className="product-img opacity-50"
                                        />
                                      </li>
                                      <li>
                                        <input
                                          readOnly
                                          type="text"
                                          value={item.productName}
                                          disabled
                                          className="opacity-50"
                                        />
                                      </li>
                                      <li>
                                        <input
                                          readOnly
                                          type="text"
                                          placeholder="...#/kg"
                                          value={item.size + "/kg"}
                                          disabled
                                          className="opacity-50"
                                        />
                                      </li>
                                      <li>
                                        <input
                                          readOnly
                                          type="text"
                                          value={item.productCode}
                                          disabled
                                          className="opacity-50"
                                        />
                                      </li>
                                      <li>
                                        <input
                                          readOnly
                                          type="text"
                                          value={item.weight}
                                          disabled
                                          className="opacity-50"
                                        />
                                      </li>
                                      <li>
                                        <input
                                          readOnly
                                          type="text"
                                          value={item.quantityLeft}
                                          disabled
                                          className="opacity-50"
                                        />
                                      </li>
                                      <li>
                                        <input
                                          readOnly
                                          type="text"
                                          value={item.startPrice}
                                          disabled
                                          className="opacity-50"
                                        />
                                      </li>
                                      <li>
                                        <input
                                          readOnly
                                          type="text"
                                          value={item.currentPrice}
                                          disabled
                                          className="opacity-50"
                                        />
                                      </li>
                                      <li>
                                        <button
                                          className="btn opacity-50"
                                          disabled
                                        >
                                          {t("marketPage.bid_now")}
                                        </button>
                                      </li>
                                    </motion.ul>
                                  ))}
                                </CarouselUl>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                      <div className="c-border"></div>
                    </motion.div>
                  ) : (
                    <>
                      {Object.entries(filteredRegionProducts).map(
                        ([regionCode, vessels]) => (
                          <motion.div
                            key={regionCode}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="market__big-area"
                          >
                            <div className="c-border"></div>
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              className="moving__heading"
                            >
                              <div className="moving__from">
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3, delay: 0.1 }}
                                  className="moving__from-title "
                                >
                                  Từ Ngư Trường:
                                </motion.p>
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3, delay: 0.2 }}
                                  className="moving__from-name color-gray-500"
                                >
                                  {t(
                                    regionCode === "D"
                                      ? "marketPage.area_hpqn"
                                      : regionCode === "C"
                                      ? "marketPage.area_hs"
                                      : regionCode === "B"
                                      ? "marketPage.area_nt_bt_vt"
                                      : "marketPage.area_cm_kg"
                                  )}
                                </motion.p>
                              </div>
                              <select
                                value={selectedPortId}
                                onChange={(e) =>
                                  setSelectedPortId(e.target.value)
                                }
                                className="moving__from max-w-[100px]"
                              >
                                <option value="">All Ports</option>
                                {ports
                                  .filter(
                                    (port) =>
                                      port.classification ===
                                      (regionCode === "D"
                                        ? 1
                                        : regionCode === "C"
                                        ? 2
                                        : regionCode === "B"
                                        ? 3
                                        : 4)
                                  )
                                  .map((port) => (
                                    <option
                                      className="moving__from-title"
                                      key={port.id}
                                      value={port.id}
                                    >
                                      {port.name}
                                    </option>
                                  ))}
                              </select>
                            </motion.div>
                            <div className="market__box2-wrap">
                              {vessels
                                .filter((v) => v.productOrders.length > 0)
                                .map((vessel, vesselIdx) => (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                      duration: 0.5,
                                      delay: vesselIdx * 0.1,
                                    }}
                                    className="market__box2-info"
                                    key={vessel.vessel.id}
                                  >
                                    <div className="market__box2-price">
                                      <motion.h4
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{
                                          duration: 0.3,
                                          delay: 0.2,
                                        }}
                                        className="c-title-5 font-bold"
                                      >
                                        {t("chuyentaiPage.ship_info")}
                                      </motion.h4>
                                      <div className="market__box2-spilit">
                                        <div className="market__box2-fixed">
                                          <ul>
                                            <li>Vessel ID</li>
                                            <li>Trip ID</li>
                                            <li>Zone</li>
                                            <li>To Port</li>
                                            <li>Weight</li>
                                            <li>Price</li>
                                            <li>Departure</li>
                                            <li>Arrival</li>
                                            <li></li>
                                          </ul>
                                        </div>
                                        <div className="market__box2-slider">
                                          <CarouselUl>
                                            {vessel.productOrders
                                              .filter(
                                                (order) =>
                                                  order.type ===
                                                    "4ShareLoading" &&
                                                  ((order.stock &&
                                                    order.stock > 0) ||
                                                    (order.quantity_load &&
                                                      order.quantity_load >
                                                        0) ||
                                                    (order.available_load &&
                                                      order.available_load > 0))
                                              )
                                              .sort(
                                                (a, b) =>
                                                  new Date(
                                                    b.created_at || ""
                                                  ).getTime() -
                                                  new Date(
                                                    a.created_at || ""
                                                  ).getTime()
                                              )
                                              .map((order, orderIdx) => (
                                                <motion.ul
                                                  initial={{
                                                    opacity: 0,
                                                    x: 20,
                                                  }}
                                                  animate={{ opacity: 1, x: 0 }}
                                                  transition={{
                                                    duration: 0.4,
                                                    delay: orderIdx * 0.1,
                                                  }}
                                                  className="market__box2-item px-4"
                                                  key={order.id}
                                                >
                                                  <li>
                                                    <input
                                                      readOnly
                                                      type="text"
                                                      value={
                                                        vessel.vessel
                                                          .registration_number
                                                      }
                                                    />
                                                  </li>
                                                  <li>
                                                    <input
                                                      readOnly
                                                      type="text"
                                                      value={
                                                        vessel.vesselTrips.find(
                                                          (v) =>
                                                            v.vessel_id ===
                                                            vessel.vessel.id
                                                        )?.trip_code
                                                      }
                                                    />
                                                  </li>
                                                  <li>
                                                    <input
                                                      readOnly
                                                      type="text"
                                                      value={"EC343"}
                                                    />
                                                  </li>
                                                  <li>
                                                    <input
                                                      readOnly
                                                      type="text"
                                                      value={
                                                        ports.find(
                                                          (port) =>
                                                            port.id ===
                                                            order.to_port
                                                        )?.name || ""
                                                      }
                                                    />
                                                  </li>
                                                  <li>
                                                    <input
                                                      readOnly
                                                      type="text"
                                                      value={order.size}
                                                    />
                                                  </li>
                                                  <li>
                                                    <input
                                                      readOnly
                                                      type="text"
                                                      value={
                                                        highestBids[order.id] ||
                                                        order.bid_price ||
                                                        order.price ||
                                                        "No bids"
                                                      }
                                                    />
                                                  </li>
                                                  <li>
                                                    <input
                                                      readOnly
                                                      type="text"
                                                      value={
                                                        order.departure_date
                                                      }
                                                    />
                                                  </li>
                                                  <li>
                                                    <input
                                                      readOnly
                                                      type="text"
                                                      value={
                                                        order?.arrival_date
                                                      }
                                                    />
                                                  </li>
                                                  <li>
                                                    <button
                                                      className="btn"
                                                      tabIndex={0}
                                                      onClick={() => {
                                                        setAuctionDialog({
                                                          isOpen: true,
                                                          vessel,
                                                          productOrder: order,
                                                          successQr: null,
                                                        });
                                                      }}
                                                    >
                                                      Contact
                                                    </button>
                                                  </li>
                                                </motion.ul>
                                              ))}
                                            {vessel.productOrders.filter(
                                              (order) =>
                                                order.type ===
                                                  "4ShareLoading" &&
                                                ((order.stock &&
                                                  order.stock > 0) ||
                                                  (order.quantity_load &&
                                                    order.quantity_load > 0) ||
                                                  (order.available_load &&
                                                    order.available_load > 0))
                                            ).length === 0 && (
                                              <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.5 }}
                                                className="flex items-center justify-center py-8 text-gray-500"
                                              >
                                                <div className="c-border">
                                                  <div className="text-center">
                                                    <div className="text-lg font-medium mb-2">
                                                      No Share Loading Products
                                                      Available
                                                    </div>
                                                    <div className="text-sm">
                                                      This vessel currently has
                                                      no products available for
                                                      share loading.
                                                    </div>
                                                  </div>
                                                </div>
                                              </motion.div>
                                            )}
                                          </CarouselUl>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                            </div>
                            <div className="c-border"></div>
                          </motion.div>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </main>

          <Dialog
            open={mapDialog.isOpen}
            onOpenChange={(open) =>
              setMapDialog((prev) => ({ ...prev, isOpen: open }))
            }
          >
            <DialogContent className="max-w-4xl max-h-[400px]">
              <DialogHeader>
                <DialogTitle>Location of {mapDialog.vesselName}</DialogTitle>
              </DialogHeader>
              {mapDialog.latitude && mapDialog.longitude && (
                <div className="h-[500px]">
                  <OpenSeaMapView />
                </div>
              )}
            </DialogContent>
          </Dialog>

          {showLoginDialog && (
            <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>
                    <h1 className="text-2xl font-bold">Please login</h1>
                  </DialogTitle>
                </DialogHeader>
                <LoginContainer />
              </DialogContent>
            </Dialog>
          )}
          {/* Auction Dialog */}
          <Dialog
            open={auctionDialog.isOpen}
            onOpenChange={(open) =>
              setAuctionDialog((prev) => ({ ...prev, isOpen: open }))
            }
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Chuyển tải</DialogTitle>
              </DialogHeader>
              {auctionDialog.vessel && auctionDialog.productOrder ? (
                <div className="space-y-4">
                  {/* Contact Information */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">
                      Transport Contact Information
                    </h3>

                    {/* Phone Number and Captain Name */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Captain Name
                        </label>
                        <p className="text-sm bg-white p-2 rounded border">
                          {auctionDialog.vessel.vessel.captain_name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <p className="text-sm bg-white p-2 rounded border">
                          {auctionDialog.vessel.crewMembers?.find(
                            (crew) => crew.position === "Captain"
                          )?.phone || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* GPS Location */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GPS Location
                      </label>
                      <p className="text-sm bg-white p-2 rounded border">
                        {auctionDialog.vessel.gps?.latitude &&
                        auctionDialog.vessel.gps?.longitude
                          ? `${auctionDialog.vessel.gps.latitude}, ${auctionDialog.vessel.gps.longitude}`
                          : "Location not available"}
                      </p>
                    </div>

                    {/* Transport Boat Name */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transport Boat Name
                      </label>
                      <p className="text-sm bg-white p-2 rounded border">
                        {auctionDialog.vessel.vessel.name}
                      </p>
                    </div>

                    {/* Routing Direction */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Routing Direction
                      </label>
                      <p className="text-sm bg-white p-2 rounded border">
                        {getPortNameById(
                          auctionDialog.productOrder.departure_port
                        )}{" "}
                        → {getPortNameById(auctionDialog.productOrder.to_port)}
                      </p>
                    </div>

                    {/* Shipping Price */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shipping Price
                      </label>
                      <p className="text-sm bg-white p-2 rounded border font-semibold text-green-600">
                        {auctionDialog.productOrder.price || 0}/kg VND
                      </p>
                    </div>

                    {/* Departure and Arrival Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Departure Date
                        </label>
                        <p className="text-sm bg-white p-2 rounded border">
                          {auctionDialog.productOrder.departure_date
                            ? new Date(
                                auctionDialog.productOrder.departure_date
                              ).toLocaleDateString()
                            : "TBD"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Est. Arrival Date
                        </label>
                        <p className="text-sm bg-white p-2 rounded border">
                          {auctionDialog.productOrder.arrival_date
                            ? new Date(
                                auctionDialog.productOrder.arrival_date
                              ).toLocaleDateString()
                            : "TBD"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setAuctionDialog((prev) => ({ ...prev, isOpen: false }))
                      }
                    >
                      Close
                    </Button>
                    <Button>Contact Transport</Button>
                  </div>
                </div>
              ) : auctionDialog.successQr ? (
                <div className="flex flex-col items-center">
                  <div id="success-qr" className="flex flex-col items-center">
                    <p className="mb-2">Chuyển tải thành công!</p>
                    <QRCodeCanvas value={auctionDialog.successQr} size={180} />
                    <p className="mt-2 break-all">{auctionDialog.successQr}</p>
                  </div>

                  <Button onClick={downloadQRCode}>Download QR</Button>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
          <Footer />
        </div>
      </div>
    </div>
  );
};

// AuctionForm component (define above or below FloatingMarket)
function AuctionForm({
  vessel,
  productOrder,
  onSuccess,
}: {
  vessel: VesselWithOrders;
  productOrder: ProductOrderWithImages;
  onSuccess: (qr: string) => void;
}) {
  const { user } = useAuthStore();
  const [buyerVesselId, setBuyerVesselId] = useState("");
  const [buyerTripId, setBuyerTripId] = useState("");
  const [catchRecordId, setCatchRecordId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(productOrder.price?.toString() || "");
  const [currency, setCurrency] = useState("VND");
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Calculate price based on quantity and total price
  const calculatePrice = () => {
    const quantityNum = Number(quantity) || 0;
    const totalPrice = productOrder.price || productOrder.bid_price || 0;
    const totalQuantity =
      productOrder.quantity_load || productOrder.available_load || 1;

    if (totalQuantity > 0) {
      const pricePerUnit = totalPrice / totalQuantity;
      return (pricePerUnit * quantityNum).toFixed(2);
    }
    return "0.00";
  };

  // Fetch all vessels for buyer selection (only user-owned)
  const [allVessels, setAllVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
  useEffect(() => {
    fetchVessels();
  }, []);

  async function fetchVessels() {
    try {
      console.log("Starting fetchVessels...");

      // First, get all product orders with type "4ShareLoading" and sufficient stock
      const { data: productOrdersData, error: ordersError } = await supabase
        .from("product_orders")
        .select(
          `
          id,
          trip_id,
          type,
          stock,
          quantity_load,
          available_load
        `
        )
        .eq("type", "4ShareLoading")
        .or("stock.gt.0,quantity_load.gt.0,available_load.gt.0");

      if (ordersError) {
        console.error("Error fetching product orders:", ordersError);
        return;
      }

      console.log("productOrdersData", productOrdersData);

      if (!productOrdersData || productOrdersData.length === 0) {
        console.log(
          "No product orders found with type 4ShareLoading and sufficient stock"
        );
        setAllVessels([]);
        return;
      }

      // Get unique trip IDs from these product orders
      const tripIds = [
        ...new Set(productOrdersData.map((order) => order.trip_id)),
      ];
      console.log("tripIds", tripIds);

      // Fetch trips for these product orders
      const { data: tripsData, error: tripsError } = await supabase
        .from("fishing_trips")
        .select(
          `
          id,
          vessel_id,
          trip_code
        `
        )
        .in("id", tripIds);

      if (tripsError) {
        console.error("Error fetching trips:", tripsError);
        return;
      }

      console.log("tripsData", tripsData);

      if (!tripsData || tripsData.length === 0) {
        console.log("No trips found for product orders");
        setAllVessels([]);
        return;
      }

      // Get unique vessel IDs from these trips
      const vesselIds = [...new Set(tripsData.map((trip) => trip.vessel_id))];
      console.log("vesselIds", vesselIds);

      // Fetch vessels that have product orders with type "4ShareLoading" and sufficient stock
      const { data: vesselsData, error: vesselsError } = await supabase
        .from("vessels")
        .select("*")
        .in("id", vesselIds)
        .order("created_at", { ascending: false });

      if (vesselsError) {
        console.error("Error fetching vessels:", vesselsError);
        return;
      }

      console.log("vesselsData", vesselsData);

      setAllVessels(vesselsData || []);
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  }
  // Fetch trips for selected buyer vessel
  const [buyerTrips, setBuyerTrips] = useState<
    Database["public"]["Tables"]["fishing_trips"]["Row"][]
  >([]);
  useEffect(() => {
    if (buyerVesselId) {
      supabase
        .from("fishing_trips")
        .select("*")
        .eq("vessel_id", buyerVesselId)
        .then(({ data }) => setBuyerTrips(data || []));
    } else {
      setBuyerTrips([]);
    }
  }, [buyerVesselId]);
  // Auto-select for To Buy
  useEffect(() => {
    if (productOrder.type === "4ShareLoading") {
      // Try to auto-select buyer vessel and trip
      if (allVessels.length > 0) {
        setBuyerVesselId(allVessels[0].id);
      }
    }
  }, [productOrder.type, allVessels]);
  useEffect(() => {
    if (productOrder.type === "4ShareLoading" && buyerTrips.length > 0) {
      setBuyerTripId(buyerTrips[0].id);
    }
  }, [productOrder.type, buyerTrips]);
  // Fetch catch records for this product order (if any)
  const [catchRecords, setCatchRecords] = useState<
    { id: string; image_url: string | null }[]
  >([]);
  useEffect(() => {
    if (productOrder.catch_id) {
      supabase
        .from("catch_records")
        .select("id,image_url,product_id,quantity")
        .eq("id", productOrder.catch_id)
        .then(({ data }) => setCatchRecords(data || []));
    }
  }, [productOrder.catch_id]);

  // Get user location
  useEffect(() => {
    // Use the location service instead of direct navigator.geolocation
    import("@/lib/location-service").then(({ locationService }) => {
      locationService
        .getCurrentLocation()
        .then((location) => {
          setUserLocation({
            latitude: location.latitude,
            longitude: location.longitude,
          });
        })
        .catch((error) => {
          console.error("Error getting location:", error);
          setError(
            "Could not determine your location. Please check your location settings."
          );
        });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!buyerVesselId) {
      setError("Please select a buyer vessel");
      setLoading(false);
      return;
    }

    if (!buyerTripId) {
      setError("Please select a buyer trip");
      setLoading(false);
      return;
    }

    const quantityNum = Number(quantity);
    const maxQuantity =
      productOrder.quantity_load || productOrder.available_load || 0;

    if (quantityNum > maxQuantity) {
      setError(`Quantity cannot exceed available stock (${maxQuantity})`);
      setLoading(false);
      return;
    }

    if (!userLocation) {
      setError("Location is required. Please enable location services.");
      setLoading(false);
      return;
    }

    try {
      const qr_code =
        productOrder.product_id + "-" + new Date().toISOString().slice(0, 6);
      const { error: insertError } = await supabase
        .from("vessel_transactions")
        .insert({
          seller_vessel_id: vessel.vessel.id,
          buyer_vessel_id: buyerVesselId,
          product_order_id: productOrder.id,
          catch_record_id: productOrder.catch_id || null,
          quantity: Number(quantity),
          unit,
          price: Number(calculatePrice()),
          currency,
          status,
          qr_code,
          transaction_date: new Date().toISOString(),
          trip_id: buyerTripId,
          type: "4ShareLoading",
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        });
      if (insertError) throw insertError;
      onSuccess(qr_code);
    } catch (e: unknown) {
      console.log("error", e);
      setError(e instanceof Error ? e.message : "Failed to submit data");
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label>
        Buyer Vessel:
        <select
          value={buyerVesselId}
          onChange={(e) => {
            setBuyerVesselId(e.target.value);
            setBuyerTripId("");
          }}
          required
          className="w-full border border-gray-300 rounded-md p-2"
        >
          <option value="">Select vessel</option>
          {allVessels.map((v) => (
            <option key={v.id} value={v.id}>
              {v.registration_number}
            </option>
          ))}
        </select>
      </label>
      <label>
        Buyer Trip:
        <select
          value={buyerTripId}
          onChange={(e) => setBuyerTripId(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md p-2"
        >
          <option value="">Select trip</option>
          {buyerTrips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.trip_code}
            </option>
          ))}
        </select>
      </label>
      <label>
        Quantity:
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          min={1}
          max={productOrder.quantity_load || productOrder.available_load || 0}
          className="w-full border !bg-white border-solid !border-gray-800 rounded-md p-2"
        />
        <small className="text-gray-500">
          Max available:{" "}
          {productOrder.quantity_load || productOrder.available_load || 0}
        </small>
      </label>

      <label>
        Price:
        <Input
          type="text"
          value={calculatePrice()}
          readOnly
          className="w-full border !bg-white border-solid !border-gray-800 rounded-md p-2"
        />
      </label>
      {!userLocation && (
        <div className="text-yellow-600 text-sm">
          Getting your location... Please enable location services.
        </div>
      )}
      {error && <div className="text-red-500">{error}</div>}
      <button
        className="btn"
        type="submit"
        disabled={loading || !buyerVesselId || !buyerTripId || !userLocation}
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

export default Chuyentai;
