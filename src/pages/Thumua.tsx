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

interface ProductOrderItem {
  id: string;
  size: number;
  tank: number;
  price: number;
  stock: number;
  tripId: string;
  fishSize: string;
  imageUrl: string;
  toPortId: string;
  vesselId: string;
  productId: string;
  catchId?: string; // Add catch_id property
  deductions: Array<{
    id: string;
    amount: number;
  }>;
  productName: string;
  quantityLoad: number;
  sourceRecordIds: string[];
}

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
  items?: ProductOrderItem[]; // Add items array
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

const Thumua = () => {
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

            // Get product orders with type "2BuyListing" and sufficient stock
            const { data: buyOrders, error: buyError } = await supabase
              .from("product_orders")
              .select("*")
              .in("trip_id", tripIds)
              .in("type", ["2BuyListing", "2ShareLoading"]);

            if (buyError) throw buyError;

            console.log(
              `Vessel ${vesselId}: Found ${
                buyOrders?.length || 0
              } buy listing orders`
            );

            // Filter for sufficient stock
            const orders = (buyOrders || []).filter(
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

            if (vesselMap[vesselId]) {
              gps = {
                latitude: vesselMap[vesselId].latitude,
                longitude: vesselMap[vesselId].longitude,
              };
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
                heading={t("thumuaPage.heading")}
                breadcrumbHome={t("thumuaPage.breadcrumb_home")}
                breadcrumbCurrent={t("thumuaPage.breadcrumb_current")}
              />
            </div>

            <div className="market">
              <div className="market__box1" ref={box1Ref}>
                <div className="container">
                  <h2 className="c-title-1">
                    <span className="c-title-1__stroke">
                      {t("thumuaPage.supply_zone")}
                    </span>{" "}
                    <br />
                    <span className="c-title-1__gradient">
                      {t("thumuaPage.supply_zone_sub")}
                    </span>
                  </h2>
                  <div className="c-border"></div>
                  <div className="market__content bg-white">
                    <div className="market__left">
                      <img
                        src="/images/top/add1.png"
                        alt={t("thumuaPage.img_alt")}
                      />
                    </div>
                    <div className="market__img text-center show_pc">
                      <img
                        src="/images/top/add2.png"
                        alt={t("thumuaPage.img_alt")}
                      />
                    </div>
                    <div className="market__map">
                      <img
                        src="/images/top/thumua2.png"
                        alt={t("thumuaPage.map_alt")}
                      />
                    </div>
                  </div>
                  <div className="market__img text-center show_sp2">
                    <img
                      src="/images/top/add2.png"
                      alt={t("thumuaPage.img_alt")}
                    />
                  </div>
                </div>
              </div>

              <div className="market__box2" ref={box2Ref}>
                <div className="container">
                  <h2 className="c-title-1">
                    <span className="c-title-1__stroke">
                      {t("thumuaPage.product_title")}
                    </span>
                    <br className="show_sp" />
                    <span className="c-title-1__gradient">
                      {t("thumuaPage.procurement")}
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
                                          Buy Now
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
                                      {t("thumuaPage.product_title")}
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
                                          <li>{t("marketPage.price")}</li>
                                          <li></li>
                                          <li></li>
                                        </ul>
                                      </div>
                                      <div className="market__box2-slider">
                                        <CarouselUl>
                                          {vessel.productOrders
                                            .filter(
                                              (order) =>
                                                (order.type === "2BuyListing" ||
                                                  order.type ===
                                                    "2ShareLoading") &&
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
                                                          productOrder?.items
                                                            ?.length > 0
                                                            ? productOrder
                                                                ?.items[0]
                                                                ?.imageUrl
                                                            : productOrder.image_url ||
                                                              productOrder
                                                                .images[0]
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
                                                      productOrder.price ||
                                                      productOrder.bid_price ||
                                                      "0.00"
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
                                                    Buy Now
                                                  </button>
                                                </li>
                                              </motion.ul>
                                            ))}
                                          {vessel.productOrders.filter(
                                            (order) =>
                                              (order.type === "2BuyListing" ||
                                                order.type ===
                                                  "2ShareLoading") &&
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
                                                    No Buy Listing Products
                                                    Available
                                                  </div>
                                                  <div className="text-sm">
                                                    This vessel currently has no
                                                    products available for buy
                                                    listing.
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
          {/* Buy Now Dialog */}
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
                    <p className="mb-2">Chuyển tải thành công!</p>
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
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);

  // Get all available items from the vessel
  // Use vessel.productOrders which contains the actual database records
  const availableItems = useMemo(() => {
    const orders = vessel.productOrders.filter(
      (order) =>
        (order.type === "2BuyListing" || order.type === "2ShareLoading") &&
        ((order.stock && order.stock > 0) ||
          (order.quantity_load && order.quantity_load > 0) ||
          (order.available_load && order.available_load > 0))
    );

    // If we have a specific productOrder and it has null items but valid data, create an item from it
    if (
      productOrder &&
      (!productOrder.items || productOrder.items.length === 0)
    ) {
      if (
        productOrder.size &&
        (productOrder.stock > 0 ||
          productOrder.quantity_load > 0 ||
          productOrder.available_load > 0) &&
        productOrder.catch_id &&
        (productOrder.price || productOrder.bid_price)
      ) {
        // Create a synthetic item from the productOrder data using catch_id for image
        const syntheticItem = {
          ...productOrder,
          imageUrl:
            productOrder.images && productOrder.images.length > 0
              ? productOrder.images[0]
              : null,
        };
        return [syntheticItem];
      }
    }

    return orders;
  }, [vessel.productOrders, productOrder]);

  // State for item selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(
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
        setItemQuantities({ [itemId]: Math.min(1, maxQty) }); // Start with 1 instead of max quantity
      }
    }
  }, [availableItems, productOrder?.id]); // Add productOrder.id as dependency

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

  // Calculate price based on quantity and total price (for single item mode)
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

      // First, get all product orders with type "2BuyListing" or "2ShareLoading" and sufficient stock
      const { data: productOrdersData, error: ordersError } = await supabase
        .from("product_orders")
        .select(
          `
          id,
          trip_id,
          type
        `
        )
        .in("type", ["2BuyListing", "2ShareLoading"])
        .or("stock.gt.0,quantity_load.gt.0,available_load.gt.0");

      if (ordersError) {
        console.error("Error fetching product orders:", ordersError);
        return;
      }

      console.log("productOrdersData", productOrdersData);

      if (!productOrdersData || productOrdersData.length === 0) {
        console.log(
          "No product orders found with type 2BuyListing or 2ShareLoading and sufficient stock"
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

      // Fetch vessels that have product orders with type "2BuyListing" and sufficient stock
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
    if (
      productOrder.type === "2BuyListing" ||
      productOrder.type === "2ShareLoading"
    ) {
      // Try to auto-select buyer vessel and trip
      if (allVessels.length > 0) {
        setBuyerVesselId(allVessels[0].id);
      }
    }
  }, [productOrder.type, allVessels]);
  useEffect(() => {
    if (
      (productOrder.type === "2BuyListing" ||
        productOrder.type === "2ShareLoading") &&
      buyerTrips.length > 0
    ) {
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

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(buyerVesselId)) {
      setError(
        "Invalid buyer vessel ID format. Please refresh the page and try again."
      );
      setLoading(false);
      return;
    }

    if (!uuidRegex.test(buyerTripId)) {
      setError(
        "Invalid buyer trip ID format. Please refresh the page and try again."
      );
      setLoading(false);
      return;
    }

    if (availableItems.length === 0) {
      setError("No items available for purchase");
      setLoading(false);
      return;
    }

    if (selectedItems.size === 0) {
      setError("Please select at least one item");
      setLoading(false);
      return;
    }

    const totalQuantity = calculateTotalQuantity();
    if (totalQuantity <= 0) {
      setError("Please specify quantities for selected items");
      setLoading(false);
      return;
    }

    if (!userLocation) {
      setError("Location is required. Please enable location services.");
      setLoading(false);
      return;
    }

    try {
      // Generate formatted transaction ID similar to cart-summary-popup logic
      const zoneKey = vessel.vessel.current_zone || "Z";
      const zoneNumber = String(Math.max(0, Math.round(0))); // Default zone number
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2);
      const datePart = `${dd}${mm}${yy}`;

      // Get today's transaction count for sequence
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const { count: todayCount } = await supabase
        .from("vessel_transactions")
        .select("*", { count: "exact", head: true })
        .eq("type", "2BuyListing")
        .gte("transaction_date", startOfDay.toISOString())
        .lte("transaction_date", endOfDay.toISOString());

      const sequence = String((todayCount || 0) + 1).padStart(3, "0");
      const qr_code = `PB${zoneNumber}${datePart}${sequence}`;

      // Build items payload for selected items
      const itemsPayload = Array.from(selectedItems).map((itemId) => {
        const item = availableItems.find((i) => i.id === itemId);
        const qty = itemQuantities[itemId] || 0;
        return {
          id: item?.id,
          tank: item?.tank_number,
          productName: item?.product_name,
          productId: item?.product_id,
          size: item?.size,
          stock: item?.stock,
          quantityLoad: qty,
          price: item?.price || item?.bid_price || 0,
          tripId: item?.trip_id,
          vesselId: vessel.vessel.id,
        };
      });

      // Create transaction for each selected item or one aggregated transaction
      if (selectedItems.size === 1) {
        // Single item transaction
        const item = availableItems.find((i) => selectedItems.has(i.id));
        const qty = itemQuantities[item?.id || ""] || 0;

        const { error: insertError } = await supabase
          .from("vessel_transactions")
          .insert({
            seller_vessel_id: vessel.vessel.id,
            buyer_vessel_id: buyerVesselId,
            product_order_id: item?.id,
            catch_record_id: item?.catchId || null,
            quantity: qty,
            unit,
            price: (item?.price || item?.bid_price || 0) * qty,
            currency,
            status,
            qr_code,
            transaction_date: new Date().toISOString(),
            trip_id: buyerTripId,
            type: "2BuyListing",
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            items: itemsPayload,
          });
        if (insertError) throw insertError;

        // Deduct stock from product_orders
        // Validate item ID before making database update
        if (!item?.id || item.id === "undefined") {
          throw new Error(
            "Invalid product order ID. Please refresh the page and try again."
          );
        }

        const { error: updateError } = await supabase
          .from("product_orders")
          .update({
            quantity_load: Math.max(0, (item?.quantity_load || 0) - qty),
            available_load: Math.max(0, (item?.available_load || 0) - qty),
            stock: Math.max(0, (item?.stock || 0) - qty),
          })
          .eq("id", item?.id);
        if (updateError) throw updateError;
      } else {
        // Multiple items - create aggregated transaction
        const totalPrice = calculateTotalPrice();

        const { error: insertError } = await supabase
          .from("vessel_transactions")
          .insert({
            seller_vessel_id: vessel.vessel.id,
            buyer_vessel_id: buyerVesselId,
            product_order_id: Array.from(selectedItems)[0], // Use first item as primary
            quantity: totalQuantity,
            unit: "mixed",
            price: totalPrice,
            currency,
            status,
            qr_code,
            transaction_date: new Date().toISOString(),
            trip_id: buyerTripId,
            type: "2BuyListing",
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            items: itemsPayload,
          });
        if (insertError) throw insertError;

        // Deduct stock from each selected product_order
        for (const itemId of selectedItems) {
          const item = availableItems.find((i) => i.id === itemId);
          const qty = itemQuantities[itemId] || 0;

          // Validate itemId before making database update
          if (!itemId || itemId === "undefined") {
            console.warn("Skipping update for undefined itemId");
            continue;
          }

          if (item && qty > 0) {
            const { error: updateError } = await supabase
              .from("product_orders")
              .update({
                quantity_load: Math.max(0, (item.quantity_load || 0) - qty),
                available_load: Math.max(0, (item.available_load || 0) - qty),
                stock: Math.max(0, (item.stock || 0) - qty),
              })
              .eq("id", itemId);
            if (updateError) throw updateError;
          }
        }
      }

      setTransactionSuccess(true);
      onSuccess(qr_code);
    } catch (e: unknown) {
      console.log("error", e);

      // Handle specific UUID validation errors
      if (e && typeof e === "object" && "code" in e && e.code === "22P02") {
        setError(
          "Invalid data format. Please check all required fields and try again."
        );
      } else if (
        e &&
        typeof e === "object" &&
        "message" in e &&
        typeof e.message === "string" &&
        e.message.includes("uuid")
      ) {
        setError(
          "Invalid ID format detected. Please refresh the page and try again."
        );
      } else {
        setError(e instanceof Error ? e.message : "Failed to submit data");
      }

      // TODO: Implement rollback logic here if needed
      // This would restore the stock quantities if the transaction fails
    } finally {
      setLoading(false);
    }
  };

  // Get first available item for image display
  const firstSelectedItem = availableItems.find((item) =>
    selectedItems.has(item.id)
  );
  const displayItem = firstSelectedItem || availableItems[0] || productOrder;

  return (
    <div className="flex flex-col gap-4">
      {/* Seller Vessel Location Display */}
      {vessel.gps && (
        <div className="bg-blue-50 p-3 rounded-lg border">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-blue-800">
                Seller Vessel Location
              </h4>
              <p className="text-sm text-blue-600">
                Lat: {vessel.gps.latitude?.toFixed(6)}, Lng:{" "}
                {vessel.gps.longitude?.toFixed(6)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowLocationDialog(true)}
              className="text-blue-600 border-blue-300"
            >
              <MapPin size={16} className="mr-1" />
              View Location
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Success Message */}
      {transactionSuccess && (
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-green-800">
                Transaction Successful!
              </h4>
              <p className="text-sm text-green-600">
                Your purchase has been processed.
              </p>
            </div>
            {vessel.gps && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLocationDialog(true)}
                className="text-green-600 border-green-300"
              >
                <MapPin size={16} className="mr-1" />
                View Seller Location
              </Button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Item Selection Section */}
        {availableItems.length > 1 ? (
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">
                Available Items ({availableItems.length})
              </h4>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllItems}
                  disabled={selectedItems.size === availableItems.length}
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
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedItems.has(item.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  } `}
                  onClick={() => toggleItemSelection(item.id)}
                >
                  <div className="flex justify-between items-start gap-3">
                    {/* Item Image */}
                    <div className="flex-shrink-0 relative">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="rounded mt-1 flex-shrink-0 absolute top-0 left-[-20px]"
                      />
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg border flex items-center justify-center">
                          <div className="text-2xl sm:text-4xl mb-2">📦</div>{" "}
                          <span className="text-xs text-gray-500">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm sm:text-base">
                            Tank {item.tank_number}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 truncate">
                            {item.product_name}
                          </div>
                          <div className="text-xs sm:text-sm">
                            Size: {item.size}kg • Available:{" "}
                            {item.quantity_load || item.available_load || 0}
                          </div>
                          <div className="text-xs sm:text-sm font-medium text-green-600">
                            {item.price || item.bid_price || 0} VND per unit
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedItems.has(item.id) && (
                      <div className="text-right flex-shrink-0">
                        <div className="font-medium text-sm sm:text-base">
                          {(
                            (item.price || item.bid_price || 0) *
                            (itemQuantities[item.id] || 0)
                          ).toLocaleString()}{" "}
                          VND
                        </div>
                        {selectedItems.has(item.id) && (
                          <div className="mt-2 ml-6">
                            <label className="block text-xs sm:text-sm font-medium mb-1">
                              Quantity to buy:
                            </label>
                            <Input
                              type="number"
                              min={1}
                              max={
                                item.quantity_load || item.available_load || 0
                              }
                              value={itemQuantities[item.id] || ""}
                              onChange={(e) =>
                                updateItemQuantity(
                                  item.id,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-full border !bg-white border-solid !border-gray-800 rounded-md p-2"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Selection Summary */}
            {selectedItems.size > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    Selected Items: {selectedItems.size}
                  </span>
                  <div className="text-right">
                    <div>Total Quantity: {calculateTotalQuantity()}</div>
                    <div className="font-bold text-lg text-red-600">
                      Total: {calculateTotalPrice().toLocaleString()} VND
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : availableItems.length === 1 ? (
          // Single item display
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Item Details</h4>
            <div className="space-y-2">
              <div>
                Tank {availableItems[0].tank} - {availableItems[0].productName}
              </div>
              <div className="text-sm text-gray-600">
                Size: {availableItems[0].size}kg • Available:{" "}
                {availableItems[0].quantityLoad || availableItems[0].stock || 0}
              </div>
              <div className="text-sm font-medium text-green-600">
                Price: {availableItems[0].price || 0} VND per unit
              </div>

              <label className="block">
                <span className="text-sm font-medium">Quantity to buy:</span>
                <Input
                  type="number"
                  min={1}
                  max={
                    availableItems[0].quantityLoad ||
                    availableItems[0].stock ||
                    0
                  }
                  value={itemQuantities[availableItems[0].id] || ""}
                  onChange={(e) =>
                    updateItemQuantity(
                      availableItems[0].id,
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-full border !bg-white border-solid !border-gray-800 rounded-md p-2"
                  required
                />
              </label>

              {itemQuantities[availableItems[0].id] && (
                <div className="font-bold text-lg text-red-600">
                  Total:{" "}
                  {(
                    availableItems[0].price *
                    itemQuantities[availableItems[0].id]
                  ).toLocaleString()}{" "}
                  VND
                </div>
              )}
            </div>
          </div>
        ) : (
          // No items available - show productOrder details
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Product Details</h4>
            <div className="space-y-2">
              <div>
                Tank {productOrder.tank_number} - {productOrder.product_name}
              </div>
              <div className="text-sm text-gray-600">
                Size: {productOrder.size}kg • Available:{" "}
                {productOrder.quantity_load || productOrder.available_load || 0}
              </div>
              <div className="text-sm font-medium text-green-600">
                Price: {productOrder.price || productOrder.bid_price || 0} VND
                per unit
              </div>

              <label className="block">
                <span className="text-sm font-medium">Quantity to buy:</span>
                <Input
                  type="number"
                  min={1}
                  max={
                    productOrder.quantity_load ||
                    productOrder.available_load ||
                    0
                  }
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full border !bg-white border-solid !border-gray-800 rounded-md p-2"
                  required
                />
              </label>

              {quantity && (
                <div className="font-bold text-lg text-red-600">
                  Total:{" "}
                  {(
                    (productOrder.price || productOrder.bid_price || 0) *
                    quantity
                  ).toLocaleString()}{" "}
                  VND
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center md:flex-row flex-col gap-2">
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
        </div>

        {!userLocation && (
          <div className="text-yellow-600 text-sm">
            Getting your location... Please enable location services.
          </div>
        )}
        {error && <div className="text-red-500">{error}</div>}

        <button className="btn" type="submit">
          {loading ? "Processing..." : "Buy Now"}
        </button>
      </form>

      {/* Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Seller Vessel Location</DialogTitle>
          </DialogHeader>
          {vessel.gps && (
            <div className="h-96">
              <OpenSeaMapView
                center={[vessel.gps.latitude || 0, vessel.gps.longitude || 0]}
                zoom={12}
                vessels={[
                  {
                    id: vessel.vessel.id,
                    name: vessel.vessel.name || "Seller Vessel",
                    latitude: vessel.gps.latitude?.toString() || "0",
                    longitude: vessel.gps.longitude?.toString() || "0",
                    registration_number:
                      vessel.vessel.registration_number || "",
                    type: "fishing",
                  },
                ]}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Thumua;
