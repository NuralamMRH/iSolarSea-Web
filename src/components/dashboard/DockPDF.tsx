import { useTranslation } from "@/hooks/use-translation";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

// Register the font at the top of your file (only once)
Font.register({
  family: "Roboto",
  src: "/static/OpenSans-Regular.ttf",
  fontWeight: "normal",
});
Font.register({
  family: "Roboto",
  src: "/static/OpenSans-Bold.ttf",
  fontWeight: "bold",
});

interface DockPDFProps {
  isDocking: boolean;
  loading: boolean;
  orderLoading: boolean;
  transactionLoading: boolean;
  trips: Array<{ id: string; trip_code: string }>;
  selectedTripId: string;
  catchRecords: Array<{
    id: string;
    haul_id: {
      id: string;
      haul_number: number;
      qr_code: string;
    };
    species: string;
    quantity: number;
    unit: string;
    quality: string;
    processing_method: string;
    catching_location: string;
    fish_name: string;
    fish_specie: string;
    fish_size: string;
    tank: string;
    case_size: string;
    net_kg_per_case: number;
    capture_date: string;
    capture_time: string;
    capture_zone: string;
    three_a_code: string;
    qr_code: string;
    farmer_id: string;
    image_url: string;
    latitude?: string | number;
    longitude?: string | number;
    crew_count?: string;
  }>;
  transactions: Array<{
    id?: string;
    transaction_date?: string;
    seller_vessel_id?: string;
    buyer_vessel_id?: string;
    type?: string;
    quantity?: number;
    unit?: string;
    price?: number;
    currency?: string;
    status?: string;
  }>;
  orders: Array<{
    id?: string;
    tank_number?: number;
    product_name?: string;
    product_id?: string;
    type?: string;
    quantity_load?: number;
    available_load?: number;
    bid_price?: number;
    price?: number;
    departure_date?: string;
    arrival_date?: string;
    created_at?: string;
  }>;
  catchError?: string;
  orderError?: string;
  transactionError?: string;
  vesselMap: Record<string, { registration_number?: string; name?: string }>;
  data: {
    vessel_id: string;
    vessel: string;
    owner_name: string;
    address: string;
    number_of_crew: string;
    vessel_type: string;
    departure_province: string;
    place_of_departure: string;
    departure_port: string;
    departure_port_name: string;
    to_region: string;
    departure_date: string;
    trip_period: string;
    status: string;
    form_code: string;
    trip_code: string;
    // Optionally add QR code URLs if you have them
    form_qr_url?: string;
    trip_qr_url?: string;
    dock_province: string;
    place_of_dock: string;
    docking_date: string;
    total_trip_period: number;
    fishing_logbook?: string;
    trading_logbook?: string;
    transshipment_logbook?: string;
    crew_count?: string;
  };
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 12, fontFamily: "Roboto" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  qrBox: { alignItems: "center", width: 70 },
  qrLabel: { fontSize: 8, marginTop: 2 },
  header: { textAlign: "center", flex: 1 },
  title: { fontWeight: "bold", fontSize: 14, marginBottom: 2 },
  subtitle: { fontSize: 10, marginBottom: 2 },
  sectionHeader: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: 15,
    marginVertical: 8,
  },
  fieldBlock: { marginBottom: 8 },
  label: { fontWeight: "bold", fontSize: 11, marginBottom: 2 },
  valueBox: {
    backgroundColor: "#fff",
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#333",
  },
  signature: { marginTop: 32, textAlign: "right", fontSize: 11 },
  signatureLabel: { fontWeight: "bold", marginTop: 12 },
  signatureSub: { fontSize: 9 },
  tableContainer: { marginTop: 16 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 8,
    textAlign: "center",
  },
  tableHeaderCell: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  sectionTitle: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 14,
    marginVertical: 8,
    color: "#374151",
  },
  sectionSubtitle: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 8,
    color: "#6b7280",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 10,
  },
  emptyCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 10,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#dbeafe",
    paddingVertical: 8,
    fontWeight: "bold",
  },
  summaryCell: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export function DockPDF({
  data,
  isDocking,
  loading,
  orderLoading,
  transactionLoading,
  trips,
  selectedTripId,
  catchRecords,
  transactions,
  orders = [],
  catchError,
  orderError,
  transactionError,
  vesselMap = {},
}: DockPDFProps) {
  const { t } = useTranslation();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with QR codes */}
        <View style={styles.headerRow}>
          <View style={styles.qrBox}>
            {data.form_qr_url && (
              <Image src={data.form_qr_url} style={{ width: 50, height: 50 }} />
            )}
            <Text style={styles.qrLabel}>
              {isDocking ? t("departure.dock_qr") : t("departure.form_qr")}
            </Text>
          </View>
          <View style={styles.header}>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 10,
                textTransform: "uppercase",
              }}
            >
              {t("departure.socialist_republic_of_vietnam")}
            </Text>
            <Text style={styles.title}>
              {t("departure.independence_freedom_happiness")}
            </Text>
            <Text style={{ fontWeight: "bold", fontSize: 11, marginTop: 4 }}>
              {t("departure.general_declaration")}
            </Text>
          </View>
          <View style={styles.qrBox}>
            {data.trip_qr_url ? (
              <Image src={data.trip_qr_url} style={{ width: 50, height: 50 }} />
            ) : (
              <View
                style={{
                  width: 50,
                  height: 50,
                  backgroundColor: "#eee",
                  borderRadius: 4,
                  marginBottom: 2,
                }}
              />
            )}
            <Text style={styles.qrLabel}>{t("departure.trip_qr")}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>{t("departure.vessel_info")}</View>

        {/* Each field label above value, blue box for value */}
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Vessel Id</Text>
          <Text style={styles.valueBox}>{data.vessel}</Text>
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{t("departure.owner")}:</Text>
          <Text style={styles.valueBox}>{data.owner_name}</Text>
        </View>
        {data.address && (
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{t("departure.address")}:</Text>
            <Text style={styles.valueBox}>{data.address}</Text>
          </View>
        )}
        {data.crew_count && (
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>
              {t("departure.number_of_crew_members_crews")}:
            </Text>
            <Text style={styles.valueBox}>{data.crew_count}</Text>
          </View>
        )}
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{t("departure.type_of_vessel")}:</Text>
          <Text style={styles.valueBox}>{data.vessel_type}</Text>
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>
            {t("departure.departure_province_city")}:
          </Text>
          <Text style={styles.valueBox}>{data.departure_province}</Text>
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{t("departure.place_of_departure")}:</Text>
          <Text style={styles.valueBox}>{data.place_of_departure}</Text>
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{t("departure.to_region")}:</Text>
          <Text style={styles.valueBox}>{data.to_region}</Text>
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{t("departure.departure_date")} :</Text>
          <Text style={styles.valueBox}>{data.departure_date}</Text>
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{t("departure.trip_period")} :</Text>
          <Text style={styles.valueBox}>{`${data.trip_period} days`}</Text>
        </View>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>{t("departure.status")}:</Text>
          <Text style={styles.valueBox}>{data.status}</Text>
        </View>
        {isDocking && (
          <>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>
                {t("departure.dock_province_city")}:
              </Text>
              <Text style={styles.valueBox}>{data.dock_province}</Text>
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{t("departure.place_of_dock")}:</Text>
              <Text style={styles.valueBox}>{data.place_of_dock}</Text>
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{t("departure.docking_date")} :</Text>
              <Text style={styles.valueBox}>{data.docking_date}</Text>
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>
                {t("departure.total_trip_period")} :
              </Text>
              <Text style={styles.valueBox}>{data.total_trip_period} days</Text>
            </View>
          </>
        )}

        {/* Fishing Logbook Section */}
        {data?.fishing_logbook === "Yes" && (
          <View style={styles.tableContainer}>
            <Text style={styles.sectionTitle}>
              THÔNG TIN NHẬT KÝ KHAI THÁC THỦY SẢN THEO MẺ
            </Text>
            <Text style={styles.sectionSubtitle}>FISHING LOGBOOK BY HAUL</Text>

            <View style={styles.infoRow}>
              <Text style={{ fontSize: 10 }}>Trip Id: {data?.trip_code}</Text>
              <Text style={{ fontSize: 10 }}>Vessel Id: {data?.vessel_id}</Text>
            </View>

            {loading ? (
              // Loading state - show empty table with placeholders
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Haul #</Text>
                  <Text style={styles.tableHeaderCell}>Location</Text>
                  <Text style={styles.tableHeaderCell}>Zone</Text>
                  <Text style={styles.tableHeaderCell}>Capture Time</Text>
                  <Text style={styles.tableHeaderCell}>Product ID</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Tank</Text>
                  <Text style={styles.tableHeaderCell}>Net kg/case</Text>
                </View>
                {[...Array(5)].map((_, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                  </View>
                ))}
              </View>
            ) : catchError ? (
              <View style={{ padding: 16, textAlign: "center" }}>
                <Text style={{ color: "#dc2626", fontSize: 12 }}>
                  Error Loading Data: {catchError}
                </Text>
              </View>
            ) : catchRecords.length === 0 ? (
              // Empty state - show table with dashes
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Haul #</Text>
                  <Text style={styles.tableHeaderCell}>Location</Text>
                  <Text style={styles.tableHeaderCell}>Zone</Text>
                  <Text style={styles.tableHeaderCell}>Capture Time</Text>
                  <Text style={styles.tableHeaderCell}>Product ID</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Tank</Text>
                  <Text style={styles.tableHeaderCell}>Net kg/case</Text>
                </View>
                {[...Array(5)].map((_, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                  </View>
                ))}
              </View>
            ) : (
              // Data state - show actual records
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Haul #</Text>
                  <Text style={styles.tableHeaderCell}>Location</Text>
                  <Text style={styles.tableHeaderCell}>Zone</Text>
                  <Text style={styles.tableHeaderCell}>Capture Time</Text>
                  <Text style={styles.tableHeaderCell}>Product ID</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Tank</Text>
                  <Text style={styles.tableHeaderCell}>Net kg/case</Text>
                </View>
                {catchRecords.map((record, index) => (
                  <View key={record.id || index} style={styles.tableRow}>
                    <Text style={styles.tableCell}>
                      {record?.haul_id?.haul_number || "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {record?.catching_location || "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {record?.capture_zone || "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {record?.capture_time
                        ? new Date(record.capture_time).toLocaleDateString(
                            "vi-VN"
                          )
                        : "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {record?.qr_code || "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {record?.quantity || "-"}
                    </Text>
                    <Text style={styles.tableCell}>{record?.tank || "-"}</Text>
                    <Text style={styles.tableCell}>
                      {record?.net_kg_per_case
                        ? `${record.net_kg_per_case} ${record?.unit || ""}`
                        : "-"}
                    </Text>
                  </View>
                ))}
                {/* Summary row */}
                {catchRecords.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryCell, { flex: 7 }]}>
                      Total Catch Volume
                    </Text>
                    <Text style={styles.summaryCell}>
                      {catchRecords.reduce(
                        (sum, rec) => sum + Number(rec.quantity || 0),
                        0
                      )}
                    </Text>
                    <Text style={styles.summaryCell}>
                      {
                        Array.from(new Set(catchRecords.map((rec) => rec.tank)))
                          .length
                      }
                    </Text>
                    <Text style={styles.summaryCell}>
                      {catchRecords
                        .reduce(
                          (sum, rec) => sum + Number(rec.net_kg_per_case || 0),
                          0
                        )
                        .toFixed(2)}{" "}
                      kg
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Trading Logbook Section */}
        {data?.trading_logbook === "Yes" && (
          <View style={styles.tableContainer}>
            <Text style={styles.sectionTitle}>
              THÔNG TIN NHẬT KÝ KHAI THÁC THỦY SẢN THEO MẺ
            </Text>
            <Text style={styles.sectionSubtitle}>TRADING LOGBOOK BY HAUL</Text>

            <View style={styles.infoRow}>
              <Text style={{ fontSize: 10 }}>Trip Id: {data?.trip_code}</Text>
              <Text style={{ fontSize: 10 }}>Vessel Id: {data?.vessel_id}</Text>
            </View>

            {orderLoading ? (
              // Loading state
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Tank</Text>
                  <Text style={styles.tableHeaderCell}>Product Name</Text>
                  <Text style={styles.tableHeaderCell}>Product ID</Text>
                  <Text style={styles.tableHeaderCell}>Type</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Bid Price</Text>
                  <Text style={styles.tableHeaderCell}>Price</Text>
                  <Text style={styles.tableHeaderCell}>Departure</Text>
                  <Text style={styles.tableHeaderCell}>Arrival</Text>
                  <Text style={styles.tableHeaderCell}>Created</Text>
                </View>
                {[...Array(5)].map((_, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                  </View>
                ))}
              </View>
            ) : orderError ? (
              <View style={{ padding: 16, textAlign: "center" }}>
                <Text style={{ color: "#dc2626", fontSize: 12 }}>
                  Error Loading Data: {orderError}
                </Text>
              </View>
            ) : orders.filter((o) => o.type === "2BuyListing").length === 0 ? (
              // Empty state
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Tank</Text>
                  <Text style={styles.tableHeaderCell}>Product Name</Text>
                  <Text style={styles.tableHeaderCell}>Product ID</Text>
                  <Text style={styles.tableHeaderCell}>Type</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Price</Text>
                  <Text style={styles.tableHeaderCell}>Departure</Text>
                  <Text style={styles.tableHeaderCell}>Arrival</Text>
                  <Text style={styles.tableHeaderCell}>Created</Text>
                </View>
                {[...Array(5)].map((_, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                  </View>
                ))}
              </View>
            ) : (
              // Data state
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Tank</Text>
                  <Text style={styles.tableHeaderCell}>Product Name</Text>
                  <Text style={styles.tableHeaderCell}>Product ID</Text>
                  <Text style={styles.tableHeaderCell}>Type</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Bid Price</Text>
                  <Text style={styles.tableHeaderCell}>Price</Text>
                  <Text style={styles.tableHeaderCell}>Departure</Text>
                  <Text style={styles.tableHeaderCell}>Arrival</Text>
                  <Text style={styles.tableHeaderCell}>Created</Text>
                </View>
                {orders
                  .filter((o) => o.type === "2BuyListing")
                  .map((o, index) => (
                    <View key={o.id || index} style={styles.tableRow}>
                      <Text style={styles.tableCell}>
                        {o.tank_number || "-"}
                      </Text>
                      <Text style={styles.tableCell}>
                        {o.product_name || "-"}
                      </Text>
                      <Text style={styles.tableCell}>
                        {o.product_id || "-"}
                      </Text>
                      <Text style={styles.tableCell}>{o.type || "-"}</Text>
                      <Text style={styles.tableCell}>
                        {o.quantity_load || o.available_load || "-"}
                      </Text>
                      <Text style={styles.tableCell}>{o.bid_price || "-"}</Text>
                      <Text style={styles.tableCell}>{o.price || "-"}</Text>
                      <Text style={styles.tableCell}>
                        {o.departure_date || "-"}
                      </Text>
                      <Text style={styles.tableCell}>
                        {o.arrival_date || "-"}
                      </Text>
                      <Text style={styles.tableCell}>
                        {o.created_at
                          ? o.created_at.slice(0, 19).replace("T", " ")
                          : "-"}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Transshipment Logbook Section */}
        {data?.transshipment_logbook === "Yes" && (
          <View style={styles.tableContainer}>
            <Text style={styles.sectionTitle}>
              THÔNG TIN GIAO DỊCH THEO CHUYẾN
            </Text>
            <Text style={styles.sectionSubtitle}>
              TRANS-SHIPMENT LOGBOOK BY HAUL
            </Text>

            <View style={styles.infoRow}>
              <Text style={{ fontSize: 10 }}>
                Trip Id:{" "}
                {trips.find((t) => t.id === selectedTripId)?.trip_code || "-"}
              </Text>
              <Text style={{ fontSize: 10 }}>Vessel Id: {data?.vessel_id}</Text>
            </View>

            {transactionLoading ? (
              // Loading state
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>PO #</Text>
                  <Text style={styles.tableHeaderCell}>Transaction Date</Text>
                  <Text style={styles.tableHeaderCell}>Vessel ID</Text>
                  <Text style={styles.tableHeaderCell}>Type</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Price</Text>
                  <Text style={styles.tableHeaderCell}>Amount VND</Text>
                  <Text style={styles.tableHeaderCell}>Status</Text>
                </View>
                {[...Array(5)].map((_, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                  </View>
                ))}
              </View>
            ) : transactionError ? (
              <View style={{ padding: 16, textAlign: "center" }}>
                <Text style={{ color: "#dc2626", fontSize: 12 }}>
                  Error Loading Transactions: {transactionError}
                </Text>
              </View>
            ) : transactions.length === 0 ? (
              // Empty state
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>PO #</Text>
                  <Text style={styles.tableHeaderCell}>Transaction Date</Text>
                  <Text style={styles.tableHeaderCell}>Vessel ID</Text>
                  <Text style={styles.tableHeaderCell}>Type</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Price</Text>
                  <Text style={styles.tableHeaderCell}>Amount VND</Text>
                  <Text style={styles.tableHeaderCell}>Status</Text>
                </View>
                {[...Array(5)].map((_, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                    <Text style={styles.emptyCell}>-</Text>
                  </View>
                ))}
              </View>
            ) : (
              // Data state
              <View>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>PO #</Text>
                  <Text style={styles.tableHeaderCell}>Transaction Date</Text>
                  <Text style={styles.tableHeaderCell}>Vessel ID</Text>
                  <Text style={styles.tableHeaderCell}>Type</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Price</Text>
                  <Text style={styles.tableHeaderCell}>Amount VND</Text>
                  <Text style={styles.tableHeaderCell}>Status</Text>
                </View>
                {transactions.map((tx, index) => {
                  const vessel =
                    vesselMap[tx.seller_vessel_id] ||
                    vesselMap[tx.buyer_vessel_id];
                  const amount = (tx.price || 0) * (tx.quantity || 0);
                  return (
                    <View key={tx.id || index} style={styles.tableRow}>
                      <Text style={styles.tableCell}>
                        {tx.id ? tx.id.slice(0, 8) : "-"}
                      </Text>
                      <Text style={styles.tableCell}>
                        {tx.transaction_date
                          ? new Date(tx.transaction_date).toLocaleDateString()
                          : "-"}
                      </Text>
                      <Text style={styles.tableCell}>
                        {vessel?.registration_number || vessel?.name || "-"}
                      </Text>
                      <Text style={styles.tableCell}>{tx.type || "-"}</Text>
                      <Text style={styles.tableCell}>
                        {tx.quantity ? `${tx.quantity} ${tx.unit || ""}` : "-"}
                      </Text>
                      <Text style={styles.tableCell}>
                        {tx.price
                          ? `${tx.price.toLocaleString()} ${tx.currency || ""}`
                          : "-"}
                      </Text>
                      <Text style={styles.tableCell}>
                        {amount ? `${amount.toLocaleString()} VND` : "-"}
                      </Text>
                      <Text style={styles.tableCell}>
                        {tx.status === "completed" ? "Paid" : "Unpaid"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Signature/date area */}
        <View style={styles.signature}>
          <Text>{t("departure.signature_date")}</Text>
          <Text>{t("departure.signature_date_2")}</Text>
          <Text style={styles.signatureLabel}>{t("departure.captain")}</Text>
          <Text style={styles.signatureSub}>{t("departure.master")}</Text>
        </View>
      </Page>
    </Document>
  );
}
