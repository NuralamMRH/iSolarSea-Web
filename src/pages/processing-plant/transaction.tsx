import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useVesselAccess } from "@/hooks/use-vessel-access";
import { Database } from "@/integrations/supabase/types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { Link } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import CompanyInfo from "@/components/dashboard/CompanyInfo";

// Types

type Company = Database["public"]["Tables"]["companies"]["Row"];
type Vessel = Database["public"]["Tables"]["vessels"]["Row"];
type VesselTransaction =
  Database["public"]["Tables"]["vessel_transactions"]["Row"];

export default function VesselTransactionPage() {
  const { user } = useAuthStore();
  const [company, setCompany] = useState<Company | null>(null);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [transactions, setTransactions] = useState<VesselTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();

  // Role-based access control state
  const [userRole, setUserRole] = useState<string>("");
  const [accessibleVesselIds, setAccessibleVesselIds] = useState<string[]>([]);

  useEffect(() => {
    // Center the active button when page loads
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeButton = container.querySelector(
        '[data-active="true"]'
      ) as HTMLElement;

      if (activeButton) {
        const containerWidth = container.offsetWidth;
        const buttonWidth = activeButton.offsetWidth;
        const buttonLeft = activeButton.offsetLeft;
        const scrollLeft = buttonLeft - containerWidth / 2 + buttonWidth / 2;

        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: "smooth",
        });
      }
    }
  }, []);
  // Fetch company info for current user
  useEffect(() => {
    fetchVessels();
    fetchUserRole();
  }, [user?.auth_id]);

  const fetchUserRole = async () => {
    if (!user?.auth_id) return;

    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", user.auth_id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setUserRole("");
      } else {
        setUserRole(userData?.role || "");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("");
    }
  };

  const isAdmin = () => {
    const role = userRole.toLowerCase();
    const isAdminUser =
      role === "admin" || role === "owner" || role === "moderator";
    console.log("Admin check:", { userRole, role, isAdminUser });
    return isAdminUser;
  };

  const canAccessVessel = (vesselId: string) => {
    // Admin users can access any vessel
    if (isAdmin()) return true;

    // Regular users can only access vessels they have explicit access to
    return accessibleVesselIds.includes(vesselId);
  };

  async function fetchVessels() {
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

      // Store accessible vessel IDs for transaction filtering
      setAccessibleVesselIds(accessibleVesselIds);

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

      // For admin users, also fetch all vessels for display purposes
      if (isAdmin()) {
        console.log("Admin user - fetching all vessels for display");
        const { data: allVesselsForDisplay, error: allVesselsError } =
          await supabase
            .from("vessels")
            .select("*")
            .order("created_at", { ascending: false });

        if (allVesselsError) {
          console.error(
            "Error fetching all vessels for display:",
            allVesselsError
          );
        } else {
          setVessels(allVesselsForDisplay || []);
        }
      }

      // Fetch transactions based on user role
      let transactionsToFetch: VesselTransaction[] = [];

      if (isAdmin()) {
        // Admin users can see all transactions - no vessel filtering needed
        console.log("Admin user detected - fetching all transactions");
        const { data: allTransactions, error: txError } = await supabase
          .from("vessel_transactions")
          .select("*")
          .order("created_at", { ascending: false });

        console.log("All transactions:", allTransactions);

        if (txError) {
          console.error("Error fetching all transactions:", txError);
        } else {
          transactionsToFetch = allTransactions || [];
        }
        console.log(
          "Admin: Fetched all transactions:",
          transactionsToFetch.length
        );
      } else {
        // Regular users can only see transactions for vessels they have access to
        const userVesselIds = [
          ...(ownedVessels?.map((v) => v.id) || []),
          ...accessibleVesselIds,
        ];

        console.log("Regular user vessel IDs:", userVesselIds);

        if (userVesselIds.length > 0) {
          const { data: userTransactions, error: txError } = await supabase
            .from("vessel_transactions")
            .select("*")
            .or(
              `seller_vessel_id.in.(${userVesselIds.join(
                ","
              )}),buyer_vessel_id.in.(${userVesselIds.join(",")})`
            )
            .order("transaction_date", { ascending: false });

          console.log("User All transactions:", userTransactions);

          if (txError) {
            console.error("Error fetching user transactions:", txError);
          } else {
            transactionsToFetch = userTransactions || [];
          }
        }
        console.log(
          "Regular user transactions found:",
          transactionsToFetch.length
        );
      }

      setTransactions(transactionsToFetch);

      // Fetch vessels that are referenced in the transactions but not yet loaded
      if (transactionsToFetch.length > 0) {
        const transactionVesselIds = new Set<string>();
        transactionsToFetch.forEach((tx) => {
          transactionVesselIds.add(tx.seller_vessel_id);
          transactionVesselIds.add(tx.buyer_vessel_id);
        });

        // Get vessel IDs that are not already in the vessels array
        const existingVesselIds = new Set(vessels.map((v) => v.id));
        const missingVesselIds = Array.from(transactionVesselIds).filter(
          (id) => !existingVesselIds.has(id)
        );

        if (missingVesselIds.length > 0) {
          console.log("Fetching missing vessels:", missingVesselIds);
          const { data: missingVessels, error: missingVesselsError } =
            await supabase
              .from("vessels")
              .select("*")
              .in("id", missingVesselIds);

          if (missingVesselsError) {
            console.error(
              "Error fetching missing vessels:",
              missingVesselsError
            );
          } else if (missingVessels && missingVessels.length > 0) {
            // Add missing vessels to the vessels array
            const updatedVessels = [...vessels, ...missingVessels];
            setVessels(updatedVessels);
            console.log("Added missing vessels:", missingVessels.length);
          }
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  }

  // Helper: get vessel info by id
  const vesselMap = Object.fromEntries(vessels.map((v) => [v.id, v]));
  console.log(
    "Vessel map created with",
    Object.keys(vesselMap).length,
    "vessels"
  );
  console.log("Vessel map keys:", Object.keys(vesselMap));
  console.log(
    "Transaction vessel IDs:",
    transactions.map((tx) => ({
      seller: tx.seller_vessel_id,
      buyer: tx.buyer_vessel_id,
    }))
  );

  // Use transactions directly - no additional filtering needed since RLS already handles access control
  const accessibleTransactions = transactions;

  console.log(
    "Final accessible transactions count:",
    accessibleTransactions.length
  );

  const totalBalance = accessibleTransactions.reduce(
    (sum, tx) => sum + (tx.price || 0) * (tx.quantity || 0),
    0
  );
  const received = accessibleTransactions
    .filter((tx) => tx.status === "completed")
    .reduce((sum, tx) => sum + (tx.price || 0) * (tx.quantity || 0), 0);
  const transferred = accessibleTransactions
    .filter((tx) => tx.status === "completed")
    .reduce((sum, tx) => sum + (tx.price || 0) * (tx.quantity || 0), 0);

  console.log("Transaction summary:", {
    totalTransactions: accessibleTransactions.length,
    totalBalance,
    received,
    transferred,
    userRole,
    isAdmin: isAdmin(),
  });

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={"Transaction Information"} />

        <TopButtons />

        <div
          ref={scrollContainerRef}
          className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto scroll-smooth"
        >
          <Link
            to="/processing-plant/company-profile"
            className="flex-shrink-0"
          >
            <button
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en" ? "Company Profile" : "Nhận Tải"}
              </span>
            </button>
          </Link>

          <Link to="/processing-plant/iuu" className="flex-shrink-0">
            <button
              className={`
               bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en" ? "Báo Cáo IUU" : "Báo Cáo IUU"}
              </span>
            </button>
          </Link>

          <Link to="/processing-plant/order" className="flex-shrink-0">
            <button
              className={`
               bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en" ? "Order" : "Đơn Hàng"}
              </span>
            </button>
          </Link>
          <Link to="/processing-plant/transaction" className="flex-shrink-0">
            <button
              data-active="true"
              className={`
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40
              `}
            >
              <span className="truncate">
                {language === "en" ? "Transaction" : "Giao dịch"}
              </span>
            </button>
          </Link>
        </div>

        <div className="flex flex-col gap-4 px-3 py-4 md:gap-6 md:py-6">
          {/* Role and Access Indicator */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isAdmin() ? "bg-green-500" : "bg-blue-500"
                }`}
              ></div>
              <span className="text-sm font-medium text-gray-700">
                {isAdmin()
                  ? language === "en"
                    ? "Admin Access - Viewing all transactions"
                    : "Quyền Admin - Xem tất cả giao dịch"
                  : language === "en"
                  ? "User Access - Viewing transactions for accessible vessels"
                  : "Quyền người dùng - Xem giao dịch cho tàu có quyền truy cập"}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {language === "en" ? "Role:" : "Vai trò:"}{" "}
              {userRole || "Loading..."}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:gap-8 mb-8 items-start">
            {/* Company Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-4 md:p-6 w-full lg:min-w-[300px] lg:max-w-[350px] border border-gray-200"
            >
              <CompanyInfo />
            </motion.div>
            {/* Summary Cards */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-4 lg:gap-6 xl:gap-8 w-full">
              <SummaryCard
                label="TỔNG SỐ DƯ"
                value={totalBalance}
                color="from-blue-500 to-blue-700"
                textColor="text-white"
              />
              <SummaryCard
                label="ĐÃ NHẬN"
                value={received}
                color="from-green-500 to-green-700"
                textColor="text-white"
              />
              <SummaryCard
                label="ĐÃ CHUYỂN"
                value={transferred}
                color="from-red-500 to-red-700"
                textColor="text-white"
              />
            </div>
          </div>

          {/* Table */}
          <Card className="overflow-hidden py-3 px-2 shadow-lg border border-gray-200">
            <CardHeader className=" pl-0">
              <CardTitle className="text-lg font-bold text-gray-800 p-0">
                Transaction Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-full border-collapse">
                    <TableHeader>
                      <TableRow className="border-b-2 border-black">
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20 sticky left-0 z-10">
                          PO #
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                          PO Date
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-24">
                          Vessel ID
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-24">
                          Amount VND
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="w-full border-b border-gray-200"
                        >
                          <TableCell className="border border-black px-4 py-4 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                            <motion.div
                              className="h-4 bg-gray-200 rounded animate-pulse"
                              initial={{ width: "60%" }}
                              animate={{ width: ["60%", "80%", "60%"] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          </TableCell>
                          <TableCell className="border border-black px-4 py-4 text-xs w-20">
                            <motion.div
                              className="h-4 bg-gray-200 rounded animate-pulse"
                              initial={{ width: "70%" }}
                              animate={{ width: ["70%", "90%", "70%"] }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: 0.1,
                              }}
                            />
                          </TableCell>
                          <TableCell className="border border-black px-4 py-4 text-xs w-24">
                            <motion.div
                              className="h-4 bg-gray-200 rounded animate-pulse"
                              initial={{ width: "65%" }}
                              animate={{ width: ["65%", "85%", "65%"] }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: 0.2,
                              }}
                            />
                          </TableCell>
                          <TableCell className="border border-black px-4 py-4 text-xs w-24">
                            <motion.div
                              className="h-4 bg-gray-200 rounded animate-pulse"
                              initial={{ width: "55%" }}
                              animate={{ width: ["55%", "75%", "55%"] }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: 0.3,
                              }}
                            />
                          </TableCell>
                          <TableCell className="border border-black px-4 py-4 text-xs w-16">
                            <motion.div
                              className="h-4 bg-gray-200 rounded animate-pulse"
                              initial={{ width: "40%" }}
                              animate={{ width: ["40%", "60%", "40%"] }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: 0.4,
                              }}
                            />
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : accessibleTransactions.length === 0 ? (
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-full border-collapse">
                    <TableHeader>
                      <TableRow className="border-b-2 border-black">
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20 sticky left-0 z-10">
                          PO #
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                          PO Date
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-24">
                          Vessel ID
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-24">
                          Amount VND
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="w-full border-b border-gray-200"
                        >
                          <TableCell className="border border-black px-4 py-4 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                            <div className="text-gray-400">-</div>
                          </TableCell>
                          <TableCell className="border border-black px-4 py-4 text-xs w-20">
                            <div className="text-gray-400">-</div>
                          </TableCell>
                          <TableCell className="border border-black px-4 py-4 text-xs w-24">
                            <div className="text-gray-400">-</div>
                          </TableCell>
                          <TableCell className="border border-black px-4 py-4 text-xs w-24">
                            <div className="text-gray-400">-</div>
                          </TableCell>
                          <TableCell className="border border-black px-4 py-4 text-xs w-16 font-bold">
                            <div className="text-gray-400">-</div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-full border-collapse">
                    <TableHeader>
                      <TableRow className="border-b-2 border-black">
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20 sticky left-0 z-10">
                          PO #
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-20">
                          PO Date
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-24">
                          Vessel ID
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-24">
                          Amount VND
                        </TableHead>
                        <TableHead className="border border-black bg-gray-100 px-2 py-1.5 text-xs font-bold w-16">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessibleTransactions.map((tx, idx) => {
                        const sellerVessel = vesselMap[tx.seller_vessel_id];
                        const buyerVessel = vesselMap[tx.buyer_vessel_id];
                        const vessel = sellerVessel || buyerVessel;
                        const amount = (tx.price || 0) * (tx.quantity || 0);
                        return (
                          <motion.tr
                            key={tx.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                            className="w-full cursor-pointer hover:bg-gray-50 border-b border-gray-200"
                          >
                            <TableCell className="border border-black px-4 py-4 text-xs font-medium w-20 sticky left-0 z-10 bg-white">
                              <div
                                className="truncate"
                                title={tx.id.slice(0, 8)}
                              >
                                {tx.id.slice(0, 8)}
                              </div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-20">
                              <div
                                className="truncate"
                                title={new Date(
                                  tx.transaction_date
                                ).toLocaleDateString()}
                              >
                                {new Date(
                                  tx.transaction_date
                                ).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-24">
                              <div
                                className="truncate"
                                title={
                                  vessel?.registration_number ||
                                  vessel?.name ||
                                  `${tx.seller_vessel_id.slice(
                                    0,
                                    8
                                  )} → ${tx.buyer_vessel_id.slice(0, 8)}`
                                }
                              >
                                {vessel?.registration_number ||
                                  vessel?.name ||
                                  `${tx.seller_vessel_id.slice(
                                    0,
                                    8
                                  )} → ${tx.buyer_vessel_id.slice(0, 8)}`}
                              </div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-24">
                              <div
                                className="truncate font-medium"
                                title={`${amount.toLocaleString()} VND`}
                              >
                                {amount.toLocaleString()} VND
                              </div>
                            </TableCell>
                            <TableCell className="border border-black px-4 py-4 text-xs w-16 font-bold">
                              <div className="truncate">
                                {tx.status === "completed" ? (
                                  <span className="text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">
                                    Paid
                                  </span>
                                ) : (
                                  <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs">
                                    Unpaid
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SummaryCard({
  label,
  value,
  color,
  textColor,
}: {
  label: string;
  value: number;
  color: string;
  textColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-xl px-2 md:px-4 lg:px-6 xl:px-10 py-3 md:py-4 lg:py-6 flex flex-col items-center justify-center w-full md:w-auto bg-gradient-to-br ${color} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
    >
      <div
        className={`font-bold text-xs md:text-sm lg:text-base mb-1 md:mb-2 uppercase ${textColor} text-center leading-tight`}
      >
        {label}
      </div>
      <div
        className={`text-sm md:text-lg lg:text-xl xl:text-2xl font-bold ${textColor} text-center leading-tight`}
      >
        {value.toLocaleString()} VND
      </div>
    </motion.div>
  );
}
