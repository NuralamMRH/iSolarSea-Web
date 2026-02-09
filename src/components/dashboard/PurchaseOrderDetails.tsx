import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CalendarRange } from "@/components/ui/date-range-picker";
import { Button } from "../ui/button";
import { useAuthStore } from "@/stores/auth-store";
import {
  Plus,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  QrCode,
} from "lucide-react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import QRCodeGenerator from "./QRCodeGenerator";
import QRCodeScanner from "./QRCodeScanner";

// VesselTransaction type based on schema
interface VesselTransaction {
  id: string;
  seller_vessel_id: string;
  buyer_vessel_id: string;
  catch_record_id: string | null;
  quantity: number;
  unit: string;
  price: number | null;
  currency: string;
  status: string;
  qr_code: string;
  transaction_date: string;
  created_at: string;
  trip_id: string | null;
  type: string | null;
  // Add nested vessel data
  seller_vessel?: {
    id: string;
    name: string;
    registration_number: string;
    user_id: string;
  };
  buyer_vessel?: {
    id: string;
    name: string;
    registration_number: string;
    user_id: string;
  };
  trip?: {
    id: string;
    trip_code: string;
    to_region: string;
    vessel_id: string;
  };
}

interface Vessel {
  id: string;
  registration_number: string;
  name: string;
}

export default function PurchaseOrderDetails() {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [transactions, setTransactions] = useState<VesselTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | null;
    to: Date | null;
  }>({ from: null, to: null });
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "buyer" | "seller">(
    "all"
  );
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<VesselTransaction | null>(null);

  useEffect(() => {
    fetchVessels();
  }, [user?.auth_id]);

  useEffect(() => {
    if (vessels.length > 0) {
      fetchTransactions();
    }
  }, [vessels]);

  const isAdmin = () => {
    const role = user?.role.toLowerCase();
    const isAdminUser = role === "admin" || role === "super_admin";
    console.log("Admin check:", { userRole: user?.role, role, isAdminUser });
    return isAdminUser;
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
      let adminAllVessels: Vessel[] = [];
      if (isAdmin()) {
        const { data: allVesselsData, error: allVesselsError } = await supabase
          .from("vessels")
          .select("*")
          .order("created_at", { ascending: false });
        adminAllVessels = allVesselsData || [];
      }

      // Combine owned and accessible vessels, removing duplicates
      const allVessels = [
        ...(ownedVessels || []),
        ...accessibleVessels,
        ...adminAllVessels,
      ];
      const uniqueVessels = allVessels.filter(
        (vessel, index, self) =>
          index === self.findIndex((v) => v.id === vessel.id)
      );

      setVessels(uniqueVessels);
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  }

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let transactionsToFetch: VesselTransaction[] = [];

      if (isAdmin()) {
        // Admin users can see all transactions
        console.log("Admin user detected - fetching all transactions");
        let query = supabase.from("vessel_transactions").select(`
          *,
          seller_vessel:vessels!vessel_transactions_seller_vessel_id_fkey (
            id,
            name,
            registration_number,
            user_id
          ),
          buyer_vessel:vessels!vessel_transactions_buyer_vessel_id_fkey (
            id,
            name,
            registration_number,
            user_id
          ),
          trip:fishing_trips (
            id,
            trip_code,
            to_region,
            vessel_id
          )
        `);

        if (dateRange.from && dateRange.to) {
          query = query
            .gte("transaction_date", dateRange.from.toISOString())
            .lte("transaction_date", dateRange.to.toISOString());
        }

        const { data, error } = await query.order("transaction_date", {
          ascending: false,
        });

        if (error) {
          console.error("Error fetching all transactions:", error);
        } else {
          transactionsToFetch = (data || []) as VesselTransaction[];
        }
      } else {
        // Regular users can only see transactions for vessels they have access to
        const userVesselIds = vessels.map((v) => v.id);

        console.log("Regular user vessel IDs:", userVesselIds);

        if (userVesselIds.length > 0) {
          let query = supabase.from("vessel_transactions").select(`
            *,
            seller_vessel:vessels!vessel_transactions_seller_vessel_id_fkey (
              id,
              name,
              registration_number,
              user_id
            ),
            buyer_vessel:vessels!vessel_transactions_buyer_vessel_id_fkey (
              id,
              name,
              registration_number,
              user_id
            ),
            trip:fishing_trips (
              id,
              trip_code,
              to_region,
              vessel_id
            )
          `);

          // Filter by vessels the user has access to
          const filterString = `seller_vessel_id.in.(${userVesselIds.join(
            ","
          )}),buyer_vessel_id.in.(${userVesselIds.join(",")})`;
          query = query.or(filterString);

          if (dateRange.from && dateRange.to) {
            query = query
              .gte("transaction_date", dateRange.from.toISOString())
              .lte("transaction_date", dateRange.to.toISOString());
          }

          const { data, error } = await query.order("transaction_date", {
            ascending: false,
          });

          if (error) {
            console.error("Error fetching user transactions:", error);
          } else {
            transactionsToFetch = (data || []) as VesselTransaction[];
          }
        }
      }

      console.log("Fetched transactions:", transactionsToFetch.length);
      setTransactions(transactionsToFetch);
    } catch (error) {
      console.error("Error in fetchTransactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    console.log("transactions ", transactions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, vessels]);

  // Filter transactions based on user's role (buyer/seller)
  const filteredTransactions = transactions.filter((transaction) => {
    if (roleFilter === "all") return true;

    // Check if current user is the seller (owns the seller vessel)
    const isSeller = transaction.seller_vessel?.user_id === user?.auth_id;
    // Check if current user is the buyer (owns the buyer vessel)
    const isBuyer = transaction.buyer_vessel?.user_id === user?.auth_id;

    if (roleFilter === "seller") return isSeller;
    if (roleFilter === "buyer") return isBuyer;

    return false;
  });

  // Helper function to determine user's role in a transaction
  const getUserRoleInTransaction = (transaction: VesselTransaction) => {
    const isSeller = transaction.seller_vessel?.user_id === user?.auth_id;
    const isBuyer = transaction.buyer_vessel?.user_id === user?.auth_id;

    if (isSeller && isBuyer) return "both";
    if (isSeller) return "seller";
    if (isBuyer) return "buyer";
    return "other";
  };

  const handleAcceptTransaction = async (transaction: VesselTransaction) => {
    try {
      // Determine the new status based on transaction type
      let newStatus = "AuctionAccept";
      let notificationTitle = "Auction Accepted";
      let notificationMessage = `Your auction bid for ${transaction.quantity}kg has been accepted. Please complete the payment.`;

      if (transaction.type === "2BuyListing") {
        newStatus = "2BuyListing";
        notificationTitle = "Transaction Completed";
        notificationMessage = `Your 2BuyListing transaction for ${transaction.quantity}kg has been completed.`;
      } else if (transaction.type === "4ShareLoading") {
        newStatus = "4ShareLoading";
        notificationTitle = "4ShareLoading Accepted";
        notificationMessage = `Your 4ShareLoading transaction for ${transaction.quantity}kg has been accepted.`;
      } else if (transaction.type === "2ShareLoading") {
        newStatus = "2ShareLoading";
        notificationTitle = "2ShareLoading Accepted";
        notificationMessage = `Your 2ShareLoading transaction for ${transaction.quantity}kg has been accepted.`;
      }

      const { error } = await supabase
        .from("vessel_transactions")
        .update({
          status: newStatus,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      if (error) {
        console.error("Error accepting transaction:", error);
        return;
      }

      // Send notification to buyer
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: transaction.buyer_vessel?.user_id || "",
          title: notificationTitle,
          message: notificationMessage,
          type: "transaction_accepted",
          related_id: transaction.id,
        });

      if (notificationError) {
        console.error("Error sending notification:", notificationError);
      }

      // Refresh transactions
      fetchTransactions();
    } catch (error) {
      console.error("Error accepting transaction:", error);
    }
  };

  const handleRejectTransaction = async (transaction: VesselTransaction) => {
    try {
      // Determine notification message based on transaction type
      let notificationTitle = "Auction Rejected";
      let notificationMessage = `Your auction bid for ${transaction.quantity}kg has been rejected.`;

      if (transaction.type === "4ShareLoading") {
        notificationTitle = "4ShareLoading Rejected";
        notificationMessage = `Your 4ShareLoading transaction for ${transaction.quantity}kg has been rejected.`;
      } else if (transaction.type === "2ShareLoading") {
        notificationTitle = "2ShareLoading Rejected";
        notificationMessage = `Your 2ShareLoading transaction for ${transaction.quantity}kg has been rejected.`;
      }

      const { error } = await supabase
        .from("vessel_transactions")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      if (error) {
        console.error("Error rejecting transaction:", error);
        return;
      }

      // Restore stock back to catch_records for rejected transactions
      if (transaction.catch_record_id && transaction.quantity) {
        const { data: catchRec, error: fetchErr } = await supabase
          .from("catch_records")
          .select("id, case_quantity")
          .eq("id", transaction.catch_record_id)
          .single();
        if (!fetchErr && catchRec) {
          const restored = Number(catchRec.case_quantity || 0) + Number(transaction.quantity || 0);
          const { error: updErr } = await supabase
            .from("catch_records")
            .update({ case_quantity: restored })
            .eq("id", transaction.catch_record_id);
          if (updErr) {
            console.error("Error restoring stock after rejection:", updErr);
          }
        } else if (fetchErr) {
          console.error("Error fetching catch record for restoration:", fetchErr);
        }
      }

      // Send notification to buyer
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: transaction.buyer_vessel?.user_id || "",
          title: notificationTitle,
          message: notificationMessage,
          type: "transaction_rejected",
          related_id: transaction.id,
        });

      if (notificationError) {
        console.error("Error sending notification:", notificationError);
      }

      // Refresh transactions
      fetchTransactions();
    } catch (error) {
      console.error("Error rejecting transaction:", error);
    }
  };

  const handleGenerateQRCode = (transaction: VesselTransaction) => {
    setSelectedTransaction(transaction);
    setShowQRGenerator(true);
  };

  const handleScanQRCode = () => {
    setShowQRScanner(true);
  };

  const handleTransactionComplete = (transactionId: string) => {
    // Refresh transactions after completion
    fetchTransactions();
  };

  const handlePrint = (transaction: VesselTransaction) => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Purchase Order - ${transaction.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .po-header { border-bottom: 1px solid #ccc; margin-bottom: 20px; }
              .po-title { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 10px; }
              .po-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
              .detail-group { margin-bottom: 15px; }
              .detail-label { font-weight: bold; margin-bottom: 5px; }
              .detail-value { border: 1px solid #ccc; padding: 8px; min-height: 20px; }
              .vessel-details { margin-bottom: 20px; }
              .vessel-item { margin-bottom: 10px; }
              .vessel-item .detail-value { border-color: #ef4444; }
              .table-container { overflow-x: auto; margin-top: 20px; }
              table { min-width: 100%; border-collapse: collapse; }
              th { background-color: #dbeafe; padding: 12px; text-align: left; border: 1px solid #ccc; font-weight: bold; min-width: 80px; }
              td { padding: 12px; border: 1px solid #ccc; white-space: nowrap; }
              .total { text-align: right; font-weight: bold; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="po-header">
              <div class="po-title">Purchase Order</div>
            </div>
            
            <div class="po-details">
              <div class="detail-group">
                <div class="detail-label">Receipt #:</div>
                <div class="detail-value uppercase">${transaction.id.slice(
                  0,
                  8
                )}</div>
              </div>
              <div class="detail-group">
                <div class="detail-label">PO #:</div>
                <div class="detail-value">${transaction.id.slice(0, 8)}</div>
              </div>
              <div class="detail-group">
                <div class="detail-label">Order date:</div>
                <div class="detail-value">${new Date(
                  transaction.transaction_date
                ).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div class="vessel-details">
              <div class="vessel-item">
                <div class="detail-label">• Vessel ID:</div>
                <div class="detail-value">${
                  transaction.seller_vessel?.registration_number ||
                  transaction.seller_vessel_id.slice(0, 8)
                }</div>
              </div>
              <div class="vessel-item">
                <div class="detail-label">• Trip ID:</div>
                <div class="detail-value">${
                  transaction.trip?.trip_code ||
                  transaction.trip_id?.slice(0, 8) ||
                  "N/A"
                }</div>
              </div>
              <div class="vessel-item">
                <div class="detail-label">• Delivery address:</div>
                <div class="detail-value"><em>Seaport name, City/province</em></div>
              </div>
            </div>
            
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product Type</th>
                    <th>Size (pcs/kg)</th>
                    <th>Product ID</th>
                    <th>F.P /ID</th>
                    <th>Quantity (kg)</th>
                    <th>Quy Cách (Pack)</th>
                    <th>Price (VND/kg)</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${transaction.type || "Fish Product"}</td>
                    <td>${Math.round(transaction.quantity / 10)}</td>
                    <td>${
                      transaction.catch_record_id?.slice(0, 8) || "Block-C Code"
                    }</td>
                    <td></td>
                    <td>${transaction.quantity}</td>
                    <td>${
                      transaction.unit === "kg" ? "Poly Pack 20kg" : "Case 12kg"
                    }</td>
                    <td style="text-align: right;">${
                      transaction.price?.toLocaleString() || "0"
                    }</td>
                    <td style="text-align: right; font-weight: bold;">${(
                      (transaction.price || 0) * transaction.quantity
                    ).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="total">
              Total: ${(
                (transaction.price || 0) * transaction.quantity
              ).toLocaleString()} VND
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="p-3 md:p-4 min-h-screen bg-gray-50">
      {/* Date Range Selector - Mobile Responsive */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
          <span className="text-blue-700 font-medium text-sm md:text-base">
            Từ ngày Đến ngày
          </span>
          <Button
            className="w-full md:w-auto"
            onClick={() => setShowRangeDropdown(!showRangeDropdown)}
          >
            {showRangeDropdown ? "Hide" : "Show"}
          </Button>
        </div>
        <div className="mt-4" hidden={!showRangeDropdown}>
          <CalendarRange onChange={(range) => setDateRange(range)} />
        </div>
      </div>

      {/* Role Filter and QR Scanner */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
          <span className="text-blue-700 font-medium text-sm md:text-base">
            Filter by Role:
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={roleFilter === "all" ? "default" : "outline"}
              onClick={() => setRoleFilter("all")}
              className="text-xs"
            >
              All Transactions
            </Button>
            <Button
              size="sm"
              variant={roleFilter === "seller" ? "default" : "outline"}
              onClick={() => setRoleFilter("seller")}
              className="text-xs"
            >
              As Seller
            </Button>
            <Button
              size="sm"
              variant={roleFilter === "buyer" ? "default" : "outline"}
              onClick={() => setRoleFilter("buyer")}
              className="text-xs"
            >
              As Buyer
            </Button>
          </div>

          {/* QR Scanner Button */}
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleScanQRCode}
              className="text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              <QrCode className="w-4 h-4 mr-1" />
              Scan QR Code
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading
          ? // Loading skeleton cards
            Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-lg p-6 border border-gray-200"
              >
                <motion.div
                  className="h-6 bg-gray-200 rounded mb-4 animate-pulse"
                  initial={{ width: "60%" }}
                  animate={{ width: ["60%", "80%", "60%"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      initial={{ width: "80%" }}
                      animate={{ width: ["80%", "100%", "80%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ))
          : filteredTransactions.length === 0
          ? // Empty state - Show 4 disabled transaction cards
            Array.from({ length: 4 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden opacity-50"
              >
                {/* Purchase Order Header */}
                <div className="bg-gradient-to-r from-gray-400 to-gray-600 text-white p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold">Purchase Order</h2>
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-500 text-white">
                        No Data
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 border-gray-600 hover:bg-gray-600 hover:text-white"
                        disabled
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 border-gray-600 hover:bg-gray-600 hover:text-white"
                        disabled
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Purchase Order Details */}
                <div className="p-4 space-y-4">
                  {/* Receipt and PO Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Receipt #:
                      </label>
                      <div className="border border-gray-300 rounded px-3 py-2 bg-gray-100 text-sm text-gray-400">
                        -
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PO #:
                      </label>
                      <div className="border border-gray-300 rounded px-3 py-2 bg-gray-100 text-sm text-gray-400">
                        -
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order date:
                      </label>
                      <div className="border border-gray-300 rounded px-3 py-2 bg-gray-100 text-sm text-gray-400">
                        -
                      </div>
                    </div>
                  </div>

                  {/* Vessel and Trip Details */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        • Vessel ID:
                      </label>
                      <div className="border-2 border-gray-300 rounded px-3 py-2 bg-gray-100 text-sm text-gray-400">
                        -
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        • Trip ID:
                      </label>
                      <div className="border-2 border-gray-300 rounded px-3 py-2 bg-gray-100 text-sm text-gray-400">
                        -
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        • Delivery address:
                      </label>
                      <div className="border-2 border-gray-300 rounded px-3 py-2 bg-gray-100 text-sm text-gray-400 italic">
                        -
                      </div>
                    </div>
                  </div>

                  {/* Product Table */}
                  <div className="mt-6 overflow-x-auto">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-hidden border border-gray-300 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[80px]">
                                Product Type
                              </th>
                              <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[70px]">
                                Size (pcs/kg)
                              </th>
                              <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[80px]">
                                Product ID
                              </th>
                              <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[60px]">
                                F.P /ID
                              </th>
                              <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[80px]">
                                Quantity (kg)
                              </th>
                              <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[100px]">
                                Quy Cách (Pack)
                              </th>
                              <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[90px]">
                                Price (VND/kg)
                              </th>
                              <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider min-w-[80px]">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-300">
                            <tr className="hover:bg-gray-50">
                              <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-300 whitespace-nowrap">
                                <div className="truncate max-w-[80px]">-</div>
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-300 whitespace-nowrap">
                                -
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-300 whitespace-nowrap">
                                <div className="truncate max-w-[80px]">-</div>
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-300 whitespace-nowrap">
                                -
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-300 whitespace-nowrap">
                                -
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-300 whitespace-nowrap">
                                <div className="truncate max-w-[100px]">-</div>
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-400 border-r border-gray-300 whitespace-nowrap text-right">
                                -
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap text-right font-medium">
                                -
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right mt-4">
                    <span className="text-lg font-bold text-gray-400">
                      Total: - VND
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-4">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                      No Data
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                      disabled
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                      disabled
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                      disabled
                    >
                      <QrCode className="w-4 h-4 mr-1" />
                      Generate QR Code
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          : // Transaction cards
            filteredTransactions.map((transaction, idx) => {
              const amount = (transaction.price || 0) * transaction.quantity;
              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
                >
                  {/* Purchase Order Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold">Purchase Order</h2>
                        {/* Role Badge */}
                        {(() => {
                          const role = getUserRoleInTransaction(transaction);
                          if (role === "both") {
                            return (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 text-yellow-900">
                                Both
                              </span>
                            );
                          } else if (role === "seller") {
                            return (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white">
                                Seller
                              </span>
                            );
                          } else if (role === "buyer") {
                            return (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                                Buyer
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-500 text-white">
                                Other
                              </span>
                            );
                          }
                        })()}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-800 border-blue-800 hover:bg-blue-800 hover:text-white"
                          onClick={() => handlePrint(transaction)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-800 border-blue-800 hover:bg-blue-800 hover:text-white"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Purchase Order Details */}
                  <div className="p-4 space-y-4">
                    {/* Receipt and PO Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Receipt #:
                        </label>
                        <div className="border border-gray-300 rounded px-3 py-2 bg-gray-50 text-sm uppercase">
                          {transaction.id.slice(0, 8)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          PO #:
                        </label>
                        <div className="border border-gray-300 rounded px-3 py-2 bg-gray-50 text-sm">
                          {transaction.qr_code.slice(0, 13)}..
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Order date:
                        </label>
                        <div className="border border-gray-300 rounded px-3 py-2 bg-gray-50 text-sm">
                          {new Date(
                            transaction.transaction_date
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Vessel and Trip Details */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          • Vessel ID:
                        </label>
                        <div className="border-2 border-red-300 rounded px-3 py-2 bg-red-50 text-sm">
                          {transaction.seller_vessel?.registration_number ||
                            transaction.seller_vessel_id.slice(0, 8)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          • Trip ID:
                        </label>
                        <div className="border-2 border-red-300 rounded px-3 py-2 bg-red-50 text-sm">
                          {transaction.trip?.trip_code ||
                            transaction.trip_id?.slice(0, 8) ||
                            "N/A"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          • Delivery address:
                        </label>
                        <div className="border-2 border-red-300 rounded px-3 py-2 bg-red-50 text-sm italic">
                          Seaport name, City/province
                        </div>
                      </div>
                    </div>

                    {/* Product Table */}
                    <div className="mt-6 overflow-x-auto">
                      <div className="min-w-full inline-block align-middle">
                        <div className="overflow-hidden border border-gray-300 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-blue-100">
                              <tr>
                                <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[80px]">
                                  Product Type
                                </th>
                                <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[70px]">
                                  Size (pcs/kg)
                                </th>
                                <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[80px]">
                                  Product ID
                                </th>
                                <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[60px]">
                                  F.P /ID
                                </th>
                                <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[80px]">
                                  Quantity (kg)
                                </th>
                                <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[100px]">
                                  Quy Cách (Pack)
                                </th>
                                <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider border-r border-gray-300 min-w-[90px]">
                                  Price (VND/kg)
                                </th>
                                <th className="px-2 py-2 text-xs font-bold text-left text-gray-700 uppercase tracking-wider min-w-[80px]">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-300">
                              <tr className="hover:bg-gray-50">
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap">
                                  <div
                                    className="truncate max-w-[80px]"
                                    title={transaction.type || "Fish Product"}
                                  >
                                    {transaction.type || "Fish Product"}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap">
                                  {Math.round(transaction.quantity / 10)}
                                </td>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap">
                                  <div
                                    className="truncate max-w-[80px]"
                                    title={
                                      transaction.catch_record_id?.slice(
                                        0,
                                        8
                                      ) || "Block-C Code"
                                    }
                                  >
                                    {transaction.catch_record_id?.slice(0, 8) ||
                                      "Block-C Code"}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap"></td>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap">
                                  {transaction.quantity}
                                </td>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap">
                                  <div
                                    className="truncate max-w-[100px]"
                                    title={
                                      transaction.unit === "kg"
                                        ? "Poly Pack 20kg"
                                        : "Case 12kg"
                                    }
                                  >
                                    {transaction.unit === "kg"
                                      ? "Poly Pack 20kg"
                                      : "Case 12kg"}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-300 whitespace-nowrap text-right">
                                  {transaction.price?.toLocaleString() || "0"}
                                </td>
                                <td className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap text-right font-medium">
                                  {amount.toLocaleString()}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="text-right mt-4">
                      <span className="text-lg font-bold">
                        Total: {amount.toLocaleString()} VND
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {transaction.status === "completed"
                          ? "Paid"
                          : "Pending"}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 space-y-2">
                      {/* Accept/Reject for 4SaleAuction, 4ShareLoading, 2ShareLoading */}
                      {((transaction.type === "4SaleAuction" &&
                        transaction.status === "pending") ||
                        (transaction.type === "4ShareLoading" &&
                          transaction.status === "pending") ||
                        (transaction.type === "2ShareLoading" &&
                          transaction.status === "pending")) && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcceptTransaction(transaction)}
                            className="flex-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectTransaction(transaction)}
                            className="flex-1 bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {/* Make Complete button for 2BuyListing */}
                      {transaction.type === "2BuyListing" &&
                        transaction.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcceptTransaction(transaction)}
                            className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Make Complete
                          </Button>
                        )}

                      {/* QR Code Generation for specific statuses */}
                      {[
                        "AuctionAccept",
                        "2BuyListing",
                        "2ShareLoading",
                        "4ShareLoading",
                      ].includes(transaction.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateQRCode(transaction)}
                          className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                          <QrCode className="w-4 h-4 mr-1" />
                          Generate QR Code
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
      </div>

      {/* Summary */}
      {filteredTransactions.length > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8 bg-white rounded-lg shadow-lg p-6 border border-gray-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredTransactions.length}
              </div>
              <div className="text-sm text-gray-600">Filtered Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  filteredTransactions.filter((t) => t.status === "completed")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredTransactions
                  .reduce((sum, t) => sum + (t.price || 0) * t.quantity, 0)
                  .toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Amount (VND)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {roleFilter === "all"
                  ? "All"
                  : roleFilter === "seller"
                  ? "Seller"
                  : "Buyer"}
              </div>
              <div className="text-sm text-gray-600">Current Filter</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* QR Code Components */}
      {selectedTransaction && (
        <QRCodeGenerator
          isOpen={showQRGenerator}
          onClose={() => {
            setShowQRGenerator(false);
            setSelectedTransaction(null);
          }}
          onTransactionComplete={handleTransactionComplete}
          transaction={selectedTransaction}
        />
      )}

      <QRCodeScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onTransactionComplete={handleTransactionComplete}
      />
    </div>
  );
}
