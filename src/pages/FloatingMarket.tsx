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

// Utility function to convert shorthand price to real price
const convertShorthandPrice = (value: string): number => {
  if (!value) return 0;

  const cleanValue = value.trim().toLowerCase();

  // Handle different shorthand formats
  if (cleanValue.endsWith("m")) {
    const num = parseFloat(cleanValue.slice(0, -1));
    return num * 1000000; // 1m = 1,000,000
  } else if (cleanValue.endsWith("b")) {
    const num = parseFloat(cleanValue.slice(0, -1));
    return num * 1000000000; // 1b = 1,000,000,000
  } else if (cleanValue.endsWith("k")) {
    const num = parseFloat(cleanValue.slice(0, -1));
    return num * 1000; // 1k = 1,000
  } else {
    // Handle decimal numbers like 1.3 (1.3 million)
    const num = parseFloat(cleanValue);
    if (num >= 1 && num < 1000) {
      return num * 1000000; // Assume millions if between 1-999
    }
    return num;
  }
};

// Utility function to format number with commas
const formatNumberWithCommas = (value: string | number): string => {
  if (!value) return "";

  // If it's already a number, format with commas
  if (typeof value === "number" || !isNaN(Number(value))) {
    return Number(value).toLocaleString();
  }

  // If it's a string with shorthand, convert and format
  const cleanValue = String(value).replace(/,/g, "");
  const realPrice = convertShorthandPrice(cleanValue);
  return realPrice.toLocaleString();
};

// Utility function to check if input should be converted (has shorthand suffix)
const shouldConvertShorthand = (value: string): boolean => {
  if (!value) return false;
  const cleanValue = value.trim().toLowerCase();
  return (
    cleanValue.endsWith("m") ||
    cleanValue.endsWith("b") ||
    cleanValue.endsWith("k")
  );
};

// Utility function to parse input value (only convert if shorthand detected)
const parseInputValue = (value: string): string => {
  if (!value) return "";

  // Remove commas first
  const cleanValue = value.replace(/,/g, "");

  // Only convert if it has shorthand suffix
  if (shouldConvertShorthand(cleanValue)) {
    const realPrice = convertShorthandPrice(cleanValue);
    return realPrice.toString();
  }

  // Otherwise, just return the cleaned value
  return cleanValue;
};

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
  catch_id?: string;
  latitude?: number;
  longitude?: number;
  to_region?: string;
  vessel_id?: string;
  items?: any[];
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

const FloatingMarket = () => {
  const { t } = useTranslation();
  const box1Ref = useRef<HTMLDivElement | null>(null);
  const box2Ref = useRef<HTMLDivElement | null>(null);
  const areaRefs = useRef<Array<HTMLDivElement | null>>([]);
  const heroRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  // if (!isAuthenticated) {
  //   navigate("/login");
  // }

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

  const REGION_CODES = ["A", "B", "C", "D"];

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

  // Function to get highest bid price for a catch record
  const getHighestBidPrice = async (
    orderId: string
  ): Promise<number | null> => {
    try {
      const { data, error } = await supabase
        .from("vessel_transactions")
        .select("price")
        .eq("product_order_id", orderId)
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
      if (order.id) {
        bids[order.id] = await getHighestBidPrice(order.id);
      }
    }
    setHighestBids(bids);
  };

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
        // 1. Fetch all fishing_trips with to_region and vessel info
        const { data: trips, error: tripsError } = await supabase
          .from("fishing_trips")
          .select(`*, vessels(*)`);
        if (tripsError) throw tripsError;

        console.log("Total trips fetched:", trips?.length || 0);
        console.log(
          "Sample to_region values:",
          trips?.slice(0, 5).map((t) => t.to_region)
        );

        // 2. For each region, collect all unique vessels with trips in that region
        const regionVessels: Record<string, VesselWithOrders[]> = {};
        for (const code of REGION_CODES) {
          // Trips in this region - fix the filtering to match actual data format
          const regionTrips = (trips || []).filter(
            (trip) =>
              trip.to_region &&
              (trip.to_region.trim().toUpperCase().startsWith(code) ||
                trip.to_region
                  .trim()
                  .toUpperCase()
                  .includes(code + "."))
          );

          console.log(`Region ${code}: ${regionTrips.length} trips found`);
          if (regionTrips.length > 0) {
            console.log(
              `Region ${code}: Sample to_region values:`,
              regionTrips.slice(0, 3).map((t) => t.to_region)
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

            // Get product orders with type "4SaleAuction" and sufficient stock
            const { data: auctionOrders, error: auctionError } = await supabase
              .from("product_orders")
              .select("*")
              .in("trip_id", tripIds)
              .eq("type", "4SaleAuction");

            if (auctionError) throw auctionError;

            console.log(
              `Vessel ${vesselId}: Found ${
                auctionOrders?.length || 0
              } auction orders`
            );

            // Filter for sufficient stock
            const orders = (auctionOrders || []).filter(
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
                    const { data: catchRecords } = await supabase
                      .from("catch_records")
                      .select("*")
                      .eq("id", order.catch_id);
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
            const { data: userData } = await supabase
              .from("users")
              .select("*")
              .eq("auth_id", vesselMap[vesselId].vessel.user_id)
              .single();
            vesselMap[vesselId].user = userData || null;

            // Fetch crew members for vessel
            const { data: crewData } = await supabase
              .from("crew_members")
              .select("*")
              .eq("vessel_id", vesselMap[vesselId].vessel.id);
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
    fetchRegionProducts();
  }, []);

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
                heading={t("floatingMarketHeader.heading")}
                breadcrumbHome={t("floatingMarketHeader.breadcrumb_home")}
                breadcrumbCurrent={t("floatingMarketHeader.breadcrumb_current")}
              />
            </div>

            <div className="market">
              <div className="market__box1" ref={box1Ref}>
                <div className="container">
                  <h2 className="c-title-1">
                    <span className="c-title-1__stroke">
                      {t("marketPage.supply_chain_title_stroke")}
                    </span>
                    <br />
                    <span className="c-title-1__gradient">
                      {t("marketPage.supply_chain_title_gradient")}
                    </span>
                  </h2>
                  <div className="c-border"></div>
                  <div className="market__content market__content--spec">
                    <div className="market__left">
                      <img
                        src="/images/top/market.png"
                        alt={t("marketPage.supply_chain_img_alt")}
                      />
                    </div>
                    <div className="market__map">
                      <img
                        src="/images/top/map.png"
                        alt={t("marketPage.supply_chain_map_alt")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="market__box2" ref={box2Ref}>
                <div className="container">
                  <h2 className="c-title-1">
                    <span className="c-title-1__stroke">
                      {t("marketPage.auction_title_stroke")}
                    </span>
                    <br className="show_sp" />
                    <span className="c-title-1__gradient">
                      {t("marketPage.auction_title_gradient")}
                    </span>
                  </h2>
                  {regionLoading ? (
                    <div className="space-y-8">
                      {/* Skeleton Area Cards */}
                      {Array.from({ length: 2 }).map((_, areaIdx) => (
                        <motion.div
                          key={areaIdx}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: areaIdx * 0.2 }}
                          className="market__big-area"
                        >
                          <div className="c-border"></div>
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="c-title-4 font-bold"
                          >
                            <motion.div
                              className="h-8 bg-gray-200 rounded animate-pulse"
                              initial={{ width: "40%" }}
                              animate={{ width: ["40%", "60%", "40%"] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </motion.div>
                          <div className="market__box2-wrap">
                            {Array.from({ length: 3 }).map((_, vesselIdx) => (
                              <motion.div
                                key={vesselIdx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  duration: 0.5,
                                  delay: vesselIdx * 0.1,
                                }}
                                className="market__box2-info"
                              >
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3, delay: 0.1 }}
                                  className="c-title-5"
                                >
                                  <motion.div
                                    className="h-6 bg-gray-200 rounded animate-pulse"
                                    initial={{ width: "60%" }}
                                    animate={{ width: ["60%", "80%", "60%"] }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                    }}
                                  />
                                </motion.div>
                                <div className="form-wrap">
                                  {Array.from({ length: 6 }).map(
                                    (_, fieldIdx) => (
                                      <div
                                        key={fieldIdx}
                                        className="form-group"
                                      >
                                        <motion.div
                                          className="h-4 bg-gray-200 rounded animate-pulse mb-2"
                                          initial={{ width: "40%" }}
                                          animate={{
                                            width: ["40%", "60%", "40%"],
                                          }}
                                          transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            delay: fieldIdx * 0.1,
                                          }}
                                        />
                                        <motion.div
                                          className="h-8 bg-gray-200 rounded animate-pulse"
                                          initial={{ width: "70%" }}
                                          animate={{
                                            width: ["70%", "90%", "70%"],
                                          }}
                                          transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            delay: fieldIdx * 0.1,
                                          }}
                                        />
                                      </div>
                                    )
                                  )}
                                </div>
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
                                      transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                      }}
                                    />
                                  </motion.div>
                                  <div className="market__box2-spilit">
                                    <div className="market__box2-fixed">
                                      <ul>
                                        {Array.from({ length: 10 }).map(
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
                                              {Array.from({ length: 10 }).map(
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
                              </motion.div>
                            ))}
                          </div>
                          <div className="c-border"></div>
                        </motion.div>
                      ))}
                    </div>
                  ) : Object.values(regionProducts).every(
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
                      <motion.h3
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="c-title-4 font-bold"
                      >
                        Demo Market Data
                      </motion.h3>
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
                    Object.entries(regionProducts).map(
                      ([areaKey, vessels], idx) => {
                        // Show area if there is at least one vessel (even without product orders)
                        if (!vessels || vessels.length === 0) return null;
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: idx * 0.1 }}
                            className="market__big-area"
                            key={areaKey}
                            ref={(el) => {
                              areaRefs.current[idx] = el;
                            }}
                          >
                            <div className="c-border"></div>
                            <motion.h3
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              className="c-title-4 font-bold"
                            >
                              {areaKey}
                              {t(
                                areaKey === "D"
                                  ? "marketPage.area_hpqn"
                                  : areaKey === "C"
                                  ? "marketPage.area_hs"
                                  : areaKey === "B"
                                  ? "marketPage.area_nt_bt_vt"
                                  : "marketPage.area_cm_kg"
                              )}
                            </motion.h3>
                            <div className="market__box2-wrap">
                              {vessels.map((vessel, vesselIdx) => (
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
                                  <motion.h4
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className="c-title-5"
                                  >
                                    {vessel.vessel.name}
                                  </motion.h4>
                                  <div className="form-wrap">
                                    <div className="form-group">
                                      <label>{t("marketPage.vessel_id")}</label>
                                      <input
                                        readOnly
                                        type="text"
                                        name="vessel_id"
                                        value={
                                          vessel.vessel.registration_number
                                        }
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>{t("marketPage.trip_id")}</label>
                                      <input
                                        readOnly
                                        type="text"
                                        name="trip_id"
                                        value={
                                          vessel.vesselTrips.find(
                                            (v) =>
                                              v.vessel_id === vessel.vessel.id
                                          )?.trip_code
                                        }
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>
                                        {t("marketPage.captain_name")}
                                      </label>
                                      <input
                                        readOnly
                                        type="text"
                                        name="captain_name"
                                        value="Nguyen Van A"
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>{t("marketPage.contact")}</label>
                                      <input
                                        readOnly
                                        type="text"
                                        name="contact"
                                        value={
                                          vessel.user?.phone ||
                                          vessel.user?.email ||
                                          ""
                                        }
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>{t("marketPage.gps")}</label>
                                      {vessel.gps ? (
                                        <Button
                                          onClick={() =>
                                            handleGPSClick(
                                              vessel.gps as unknown as VesselRecord
                                            )
                                          }
                                        >
                                          <MapPin /> <span>GPS</span>
                                        </Button>
                                      ) : (
                                        <span>No GPS data</span>
                                      )}
                                    </div>
                                    <div className="form-group">
                                      <label>{t("marketPage.zone")}</label>
                                      <input
                                        readOnly
                                        type="text"
                                        name="zone"
                                        value="EC(X..)"
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
                                          <li>
                                            {t("marketPage.product_name")}
                                          </li>
                                          <li>{t("marketPage.size")}</li>
                                          <li>
                                            {t("marketPage.product_code")}
                                          </li>
                                          <li>{t("marketPage.weight")}</li>
                                          <li>
                                            {t("marketPage.quantity_left")}
                                          </li>
                                          <li>{t("marketPage.start_price")}</li>
                                          <li>
                                            {t("marketPage.current_price")}
                                          </li>
                                          <li></li>
                                          <li></li>
                                        </ul>
                                      </div>
                                      <div className="market__box2-slider">
                                        <CarouselUl>
                                          {vessel.productOrders
                                            .filter(
                                              (order) =>
                                                order.type === "4SaleAuction" &&
                                                ((order.stock &&
                                                  order.stock > 0) ||
                                                  (order.quantity_load &&
                                                    order.quantity_load > 0) ||
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
                                            .map((productOrder, orderIdx) => (
                                              <motion.ul
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{
                                                  duration: 0.4,
                                                  delay: orderIdx * 0.1,
                                                }}
                                                className="market__box2-item px-4"
                                                key={productOrder.id}
                                              >
                                                <li className="market__photo">
                                                  {productOrder.images.length >
                                                  0 ? (
                                                    <a
                                                      href={
                                                        productOrder.images[0]
                                                      }
                                                      rel="lightbox"
                                                    >
                                                      <img
                                                        src={
                                                          productOrder.images[0]
                                                        }
                                                        alt={
                                                          productOrder.product_name
                                                        }
                                                        className="product-img"
                                                      />
                                                    </a>
                                                  ) : (
                                                    <img
                                                      src="/images/placeholder.jpg"
                                                      alt="No Image"
                                                      className="product-img"
                                                    />
                                                  )}
                                                </li>
                                                <li>
                                                  <input
                                                    readOnly
                                                    type="text"
                                                    value={
                                                      productOrder.product_name
                                                    }
                                                  />
                                                </li>
                                                <li>
                                                  <input
                                                    readOnly
                                                    type="text"
                                                    placeholder="...#/kg"
                                                    value={
                                                      productOrder.size + "/kg"
                                                    }
                                                  />
                                                </li>
                                                <li>
                                                  <input
                                                    readOnly
                                                    type="text"
                                                    value={
                                                      productOrder.product_id
                                                    }
                                                  />
                                                </li>
                                                <li>
                                                  <input
                                                    readOnly
                                                    type="text"
                                                    value={productOrder.size}
                                                  />
                                                </li>
                                                <li>
                                                  <input
                                                    readOnly
                                                    type="text"
                                                    value={
                                                      productOrder.quantity_load
                                                    }
                                                  />
                                                </li>
                                                <li>
                                                  <input
                                                    readOnly
                                                    type="text"
                                                    value={
                                                      highestBids[
                                                        productOrder.id
                                                      ] ||
                                                      productOrder.bid_price ||
                                                      productOrder.price
                                                        ? formatNumberWithCommas(
                                                            highestBids[
                                                              productOrder.id
                                                            ] ||
                                                              productOrder.bid_price ||
                                                              productOrder.price
                                                          )
                                                        : "No bids"
                                                    }
                                                  />
                                                </li>
                                                <li>
                                                  <input
                                                    readOnly
                                                    type="text"
                                                    value={
                                                      productOrder.bid_price
                                                        ? formatNumberWithCommas(
                                                            productOrder.bid_price
                                                          )
                                                        : ""
                                                    }
                                                  />
                                                </li>

                                                <li>
                                                  <button
                                                    className="btn"
                                                    tabIndex={0}
                                                    onClick={() => {
                                                      if (!isAuthenticated) {
                                                        setShowLoginDialog(
                                                          true
                                                        );
                                                      } else {
                                                        setAuctionDialog({
                                                          isOpen: true,
                                                          vessel,
                                                          productOrder,
                                                          successQr: null,
                                                        });
                                                      }
                                                    }}
                                                  >
                                                    {t("marketPage.bid_now")}
                                                  </button>
                                                </li>
                                              </motion.ul>
                                            ))}
                                          {vessel.productOrders.filter(
                                            (order) =>
                                              order.type === "4SaleAuction" &&
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
                                                    No Auction Products
                                                    Available
                                                  </div>
                                                  <div className="text-sm">
                                                    This vessel currently has no
                                                    products available for
                                                    auction.
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
                        );
                      }
                    )
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
          {/* Auction Dialog */}
          <Dialog
            open={auctionDialog.isOpen}
            onOpenChange={(open) =>
              setAuctionDialog((prev) => ({ ...prev, isOpen: open }))
            }
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit data</DialogTitle>
              </DialogHeader>
              {auctionDialog.successQr ? (
                <div className="flex flex-col items-center">
                  <div id="success-qr" className="flex flex-col items-center">
                    <p className="mb-2">Auction submitted successfully!</p>
                    <QRCodeCanvas value={auctionDialog.successQr} size={180} />
                    <p className="mt-2 break-all">{auctionDialog.successQr}</p>
                  </div>
                  <Button onClick={downloadQRCode}>Download QR</Button>
                </div>
              ) : auctionDialog.vessel && auctionDialog.productOrder ? (
                <AuctionForm
                  vessel={auctionDialog.vessel}
                  productOrder={auctionDialog.productOrder}
                  onSuccess={(qr) =>
                    setAuctionDialog((prev) => ({ ...prev, successQr: qr }))
                  }
                />
              ) : null}
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
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState("");
  const [bidPrice, setBidPrice] = useState(""); // Separate bid price state
  const [currency, setCurrency] = useState("VND");
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Get all available items from the vessel
  const availableItems = useMemo(() => {
    // If we have a specific productOrder, work with it directly
    if (productOrder) {
      // Check if productOrder has items array with data
      if (productOrder.items && productOrder.items.length > 0) {
        // Return the items from productOrder.items array
        return productOrder.items.map((item: any) => ({
          id: item.id || `item-${item.tank || Math.random()}`,
          tank_number: item.tank || item.tankNumber || 1,
          product_name: item.productName || productOrder.product_name,
          product_id: item.productId || productOrder.product_id,
          size: item.size || item.fishSize || productOrder.size,
          stock: item.stock || 0,
          quantity_load: item.quantityLoad || 0,
          available_load: item.stock || 0, // Use stock as available_load for items
          price: item.price || productOrder.price || 0,
          bid_price: productOrder.bid_price || 0,
          type: productOrder.type,
          trip_id: item.tripId || productOrder.trip_id,
          vessel_id: item.vesselId || productOrder.vessel_id,
          images: item.imageUrl ? [item.imageUrl] : productOrder.images || [],
          imageUrl: item.imageUrl,
          deductions: item.deductions || [],
          sourceRecordIds: item.sourceRecordIds || [],
        }));
      }
      // If items array is empty or null but productOrder has stock/quantity data, create synthetic item
      else if (
        productOrder.stock > 0 ||
        productOrder.quantity_load > 0 ||
        productOrder.available_load > 0
      ) {
        const syntheticItem = {
          id: productOrder.id,
          tank_number: productOrder.tank_number || 1,
          product_name: productOrder.product_name,
          product_id: productOrder.product_id,
          size: productOrder.size,
          stock: productOrder.stock,
          quantity_load: productOrder.quantity_load,
          available_load: productOrder.available_load || productOrder.stock,
          price: productOrder.price || 0,
          bid_price: productOrder.bid_price || 0,
          type: productOrder.type,
          trip_id: productOrder.trip_id,
          vessel_id: productOrder.vessel_id,
          images: productOrder.images || [],
          imageUrl:
            productOrder.images && productOrder.images.length > 0
              ? productOrder.images[0]
              : null,
        };
        return [syntheticItem];
      }
    }

    // Fallback: look at all vessel product orders
    const orders = vessel.productOrders.filter(
      (order) =>
        (order.stock && order.stock > 0) ||
        (order.quantity_load && order.quantity_load > 0) ||
        (order.available_load && order.available_load > 0)
    );

    return orders;
  }, [vessel.productOrders, productOrder]);

  // State for item selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(
    {}
  );
  const [itemBidPrices, setItemBidPrices] = useState<Record<string, string>>(
    {}
  );

  // Initialize selection with current productOrder if items exist
  useEffect(() => {
    // Clear previous selections first
    setSelectedItems(new Set());
    setItemQuantities({});

    if (availableItems.length > 0) {
      // If there's only one item or we're viewing a specific product order, select it
      if (availableItems.length === 1 || productOrder) {
        const itemToSelect =
          productOrder &&
          availableItems.find((item) => item.id === productOrder.id)
            ? productOrder
            : availableItems[0];

        const itemId = itemToSelect.id;
        setSelectedItems(new Set([itemId]));
        const maxQty =
          itemToSelect.quantity_load ||
          itemToSelect.available_load ||
          itemToSelect.stock ||
          0;
        setItemQuantities({ [itemId]: maxQty });
        
        // Set default quantity for single item fallback form
        if (availableItems.length === 1) {
          setQuantity(maxQty.toString());
        }
      }
    }
  }, [availableItems, productOrder?.id]);

  // Calculate total price based on selected items
  const calculateTotalPrice = () => {
    let total = 0;
    selectedItems.forEach((itemId) => {
      const item = availableItems.find((i) => i.id === itemId);
      const qty = itemQuantities[itemId] || 0;
      if (item) {
        const itemPrice = item.price || item.bid_price || 0;
        total += itemPrice * qty;
      }
    });
    return total;
  };

  // Calculate total quantity
  const calculateTotalQuantity = () => {
    let total = 0;
    selectedItems.forEach((itemId) => {
      total += itemQuantities[itemId] || 0;
    });
    return total;
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      const newQuantities = { ...itemQuantities };
      delete newQuantities[itemId];
      setItemQuantities(newQuantities);
    } else {
      newSelected.add(itemId);
      const item = availableItems.find((i) => i.id === itemId);
      const maxQty =
        item?.quantity_load || item?.available_load || item?.stock || 0;
      setItemQuantities({ ...itemQuantities, [itemId]: Math.min(1, maxQty) });
    }
    setSelectedItems(newSelected);
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, qty: number) => {
    const item = availableItems.find((i) => i.id === itemId);
    const maxQty =
      item?.quantity_load || item?.available_load || item?.stock || 0;
    const validQty = Math.min(Math.max(1, qty), maxQty); // Minimum 1, maximum available
    setItemQuantities({ ...itemQuantities, [itemId]: validQty });
  };

  // Select all items
  const selectAllItems = () => {
    const allIds = new Set(availableItems.map((item) => item.id));
    setSelectedItems(allIds);
    const newQuantities: Record<string, number> = {};
    availableItems.forEach((item) => {
      const maxQty =
        item.quantity_load || item.available_load || item.stock || 0;
      newQuantities[item.id] = Math.min(1, maxQty); // Start with 1 instead of max
    });
    setItemQuantities(newQuantities);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedItems(new Set());
    setItemQuantities({});
  };

  // Fetch all vessels for buyer selection (only user-owned)
  const [allVessels, setAllVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
  const [userAccessedVessels, setUserAccessedVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
  useEffect(() => {
    fetchVessels();
    fetchAccessibleVessels();
  }, []);

  async function fetchVessels() {
    try {
      console.log("Starting fetchVessels...");

      // First, get all product orders with type "4SaleAuction" and sufficient stock
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
        .eq("type", "4SaleAuction")
        .or("stock.gt.0,quantity_load.gt.0,available_load.gt.0");

      if (ordersError) {
        console.error("Error fetching product orders:", ordersError);
        return;
      }

      console.log("productOrdersData", productOrdersData);

      if (!productOrdersData || productOrdersData.length === 0) {
        console.log(
          "No product orders found with type 4SaleAuction and sufficient stock"
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

      // Fetch vessels that have product orders with type "4SaleAuction" and sufficient stock
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

  async function fetchAccessibleVessels() {
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

      setUserAccessedVessels(uniqueVessels as any);
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
    if (productOrder.type === "4SaleAuction") {
      // Try to auto-select buyer vessel and trip
      if (userAccessedVessels.length > 0) {
        setBuyerVesselId(userAccessedVessels[0].id);
      }
    }
  }, [productOrder.type, userAccessedVessels]);
  useEffect(() => {
    if (productOrder.type === "4SaleAuction" && buyerTrips.length > 0) {
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

    // Validate item selection
    if (availableItems.length > 1 && selectedItems.size === 0) {
      setError("Please select at least one item");
      setLoading(false);
      return;
    }

    if (!userLocation) {
      setError("Location is required. Please enable location services.");
      setLoading(false);
      return;
    }

    try {
      if (availableItems.length === 1) {
        // Single item mode - use existing logic
        const quantityNum = Number(quantity);
        const maxQuantity =
          availableItems[0].quantity_load ||
          availableItems[0].available_load ||
          availableItems[0].stock ||
          0;

        if (quantityNum > maxQuantity) {
          setError(`Quantity cannot exceed available stock (${maxQuantity})`);
          setLoading(false);
          return;
        }

        if (!price) {
          setError("Please enter a bid price");
          setLoading(false);
          return;
        }

        const qr_code =
          productOrder.product_id + new Date().toISOString().slice(0, 6);

        // Update product order stock
        const newStock = maxQuantity - quantityNum;
        const { error: updateError } = await supabase
          .from("product_orders")
          .update({
            stock: newStock,
            quantity_load: availableItems[0].quantity_load
              ? availableItems[0].quantity_load - quantityNum
              : null,
            available_load: availableItems[0].available_load
              ? availableItems[0].available_load - quantityNum
              : null,
          })
          .eq("id", productOrder.id);

        if (updateError) throw updateError;

        // Insert transaction
        const { error: insertError } = await supabase
          .from("vessel_transactions")
          .insert({
            product_order_id: productOrder.id,
            catch_record_id: productOrder.catch_id || null,
            seller_vessel_id: vessel.vessel.id,
            buyer_vessel_id: buyerVesselId,
            quantity: quantityNum,
            unit,
            price: Number(price),
            currency,
            status,
            qr_code,
            transaction_date: new Date().toISOString(),
            trip_id: buyerTripId,
            type: "4SaleAuction",
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          });

        if (insertError) throw insertError;
        onSuccess(qr_code);
      } else {
        // Multiple items mode - create transactions for each selected item
        const transactions = [];
        const productOrderUpdates = [];

        for (const itemId of selectedItems) {
          const item = availableItems.find((i) => i.id === itemId);
          const qty = itemQuantities[itemId];
          const bidPrice = itemBidPrices[itemId];

          if (!item || !qty || !bidPrice) {
            setError(
              `Please fill in quantity and bid price for all selected items`
            );
            setLoading(false);
            return;
          }

          const maxQty = item.quantity_load || item.available_load || item.stock || 0;
          if (qty > maxQty) {
            setError(
              `Quantity for ${item.product_name} cannot exceed available stock (${maxQty})`
            );
            setLoading(false);
            return;
          }

          const qr_code =
            item.product_id +
            new Date().toISOString().slice(0, 6) +
            Math.random().toString(36).substr(2, 5);

          transactions.push({
            product_order_id: item.id,
            catch_record_id: item.catch_id || null,
            seller_vessel_id: vessel.vessel.id,
            buyer_vessel_id: buyerVesselId,
            quantity: qty,
            unit,
            price: Number(bidPrice),
            currency,
            status,
            qr_code,
            transaction_date: new Date().toISOString(),
            trip_id: buyerTripId,
            type: "4SaleAuction",
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          });

          // Prepare product order updates
          const newStock = (item.stock || 0) - qty;
          productOrderUpdates.push({
            id: item.id,
            stock: newStock,
            quantity_load: item.quantity_load ? item.quantity_load - qty : null,
            available_load: item.available_load
              ? item.available_load - qty
              : null,
          });
        }

        // Update all product orders
        for (const update of productOrderUpdates) {
          const { error: updateError } = await supabase
            .from("product_orders")
            .update({
              stock: update.stock,
              quantity_load: update.quantity_load,
              available_load: update.available_load,
            })
            .eq("id", update.id);

          if (updateError) throw updateError;
        }

        // Insert all transactions
        const { error: insertError } = await supabase
          .from("vessel_transactions")
          .insert(transactions);

        if (insertError) throw insertError;
        onSuccess(transactions[0].qr_code);
      }
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
          {userAccessedVessels.map((v) => (
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

      {/* Item Selection Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Select Items</h3>
          {availableItems.length > 1 && (
            <div className="space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllItems}
                disabled={availableItems.length === 0}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllSelections}
                disabled={selectedItems.size === 0}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>

        {/* Debug info */}
        <div className="text-sm text-gray-500 p-2 bg-gray-100 rounded">
          Available Items: {availableItems.length} | Product Order Type:{" "}
          {productOrder?.type} | Stock: {productOrder?.stock} | Quantity Load:{" "}
          {productOrder?.quantity_load} | Available Load:{" "}
          {productOrder?.available_load}
        </div>

        {availableItems.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No items available for selection. Using fallback form.
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Quantity:</span>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min={1}
                  max={
                    productOrder?.stock ||
                    productOrder?.quantity_load ||
                    productOrder?.available_load ||
                    100
                  }
                  className="w-full mt-1"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Bid Price:</span>
                <Input
                  type="text"
                  value={price ? formatNumberWithCommas(price) : ""}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (!inputValue.trim()) {
                      setPrice("");
                      return;
                    }
                    const cleanInput = inputValue.replace(/,/g, "");
                    const processedValue = parseInputValue(cleanInput);
                    setPrice(processedValue);
                  }}
                  placeholder="e.g., 45,000,000 or 1m, 2M, 1b"
                  className="w-full mt-1"
                />
              </label>
            </div>
          </div>
        ) : availableItems.length === 1 ? (
          // Single item display
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                {availableItems[0].images &&
                availableItems[0].images.length > 0 ? (
                  <img
                    src={availableItems[0].images[0]}
                    alt="Product"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-xs text-gray-500">No Image</span>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium">
                  Tank {availableItems[0].tank_number}
                </h4>
                <p className="text-sm text-gray-600">
                  {availableItems[0].product_name}
                </p>
                <p className="text-sm text-gray-500">
                  Size: {availableItems[0].size}
                </p>
                <p className="text-sm text-gray-500">
                  Available:{" "}
                  {availableItems[0].quantity_load || availableItems[0].available_load || availableItems[0].stock}
                </p>
                <p className="text-sm text-gray-500">
                  Price: {formatNumberWithCommas(availableItems[0].price || 0)}{" "}
                  VND
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium">Quantity:</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
                max={
                  availableItems[0].available_load || availableItems[0].stock
                }
                className="w-full border !bg-white border-solid !border-gray-800 rounded-md p-2"
              />

              {/* Calculated Total Display for Single Item */}
              {/* Show total price automatically using real price */}
              {quantity && (
                <div className="text-lg font-bold text-red-600 mb-2">
                  Total: {formatNumberWithCommas(
                    (Number(quantity) * (availableItems[0].price || 0)).toString()
                  )} VND
                </div>
              )}

              {/* Show comparison when bid price is entered */}
              {quantity && price && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-2">
                  <div className="text-sm text-yellow-800">
                    <div className="flex justify-between">
                      <span>Your Bid Total:</span>
                      <span className="font-bold text-red-600">
                        {formatNumberWithCommas(
                          (Number(quantity) * Number(price)).toString()
                        )} VND
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Price Total:</span>
                      <span className="font-medium">
                        {formatNumberWithCommas(
                          (Number(quantity) * (availableItems[0].price || 0)).toString()
                        )} VND
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <label className="block text-sm font-medium">Bid Price:</label>
              <Input
                type="text"
                value={price ? formatNumberWithCommas(price) : ""}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (!inputValue.trim()) {
                    setPrice("");
                    return;
                  }
                  const cleanInput = inputValue.replace(/,/g, "");
                  const processedValue = parseInputValue(cleanInput);
                  setPrice(processedValue);
                }}
                placeholder="e.g., 45,000,000 or 1m, 2M, 1b"
                className="w-full border !bg-white border-solid !border-gray-800 rounded-md p-2"
              />
            </div>
          </div>
        ) : (
          // Multiple items display
          <div className="max-h-96 overflow-y-auto space-y-2">
            {availableItems.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-3 ${
                  selectedItems.has(item.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="mt-1"
                  />
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt="Product"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <span className="text-xs text-gray-500">No Image</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Tank {item.tank_number}</h4>
                    <p className="text-sm text-gray-600">{item.product_name}</p>
                    <p className="text-sm text-gray-500">Size: {item.size}</p>
                    <p className="text-sm text-gray-500">
                      Available: {item.quantity_load || item.available_load || item.stock}
                    </p>
                    <p className="text-sm text-gray-500">
                      Price: ${formatNumberWithCommas(item.price || 0)}
                    </p>
                  </div>
                </div>
                {selectedItems.has(item.id) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Quantity:
                      </label>
                      <Input
                        type="number"
                        value={itemQuantities[item.id] || ""}
                        onChange={(e) =>
                          updateItemQuantity(item.id, e.target.value)
                        }
                        min={1}
                        max={item.available_load || item.stock}
                        className="w-full"
                      />
                    </div>

                    {/* Show total price automatically using real price */}
                    {itemQuantities[item.id] && (
                      <div className="text-lg font-bold text-red-600 mb-2 col-span-2">
                        Total: {formatNumberWithCommas(
                          (Number(itemQuantities[item.id]) * (item.price || 0)).toString()
                        )} VND
                      </div>
                    )}

                    {/* Show comparison when bid price is entered */}
                    {itemQuantities[item.id] && itemBidPrices[item.id] && (
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-200 col-span-2 mb-2">
                        <div className="text-xs text-yellow-800">
                          <div className="flex justify-between">
                            <span>Your Bid Total:</span>
                            <span className="font-bold text-red-600">
                              {formatNumberWithCommas(
                                (
                                  Number(itemQuantities[item.id]) *
                                  Number(itemBidPrices[item.id])
                                ).toString()
                              )} VND
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Market Price Total:</span>
                            <span className="font-medium">
                              {formatNumberWithCommas(
                                (Number(itemQuantities[item.id]) * (item.price || 0)).toString()
                              )} VND
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bid Price:
                      </label>
                      <Input
                        type="text"
                        value={
                          itemBidPrices[item.id]
                            ? formatNumberWithCommas(itemBidPrices[item.id])
                            : ""
                        }
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (!inputValue.trim()) {
                            setItemBidPrices((prev) => ({
                              ...prev,
                              [item.id]: "",
                            }));
                            return;
                          }
                          const cleanInput = inputValue.replace(/,/g, "");
                          const processedValue = parseInputValue(cleanInput);
                          setItemBidPrices((prev) => ({
                            ...prev,
                            [item.id]: processedValue,
                          }));
                        }}
                        placeholder="Bid price"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary for multiple items */}
        {availableItems.length > 1 && selectedItems.size > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Selection Summary</h4>
            <p className="text-sm text-gray-600">
              Selected Items: {selectedItems.size} / {availableItems.length}
            </p>
            <p className="text-sm text-gray-600">
              Total Quantity: {calculateTotalQuantity()}
            </p>
            <p className="text-sm text-gray-600">
              Total Bid Price: ${formatNumberWithCommas(calculateTotalPrice())}
            </p>
          </div>
        )}
      </div>
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
        {loading ? "Submitting..." : "Submit data"}
      </button>
    </form>
  );
}

export default FloatingMarket;
