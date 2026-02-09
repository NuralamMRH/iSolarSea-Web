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

interface DeparturePDFProps {
  isDocking: boolean;
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
    backgroundColor: "#e0edff",
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    marginBottom: 2,
  },
  signature: { marginTop: 32, textAlign: "right", fontSize: 11 },
  signatureLabel: { fontWeight: "bold", marginTop: 12 },
  signatureSub: { fontSize: 9 },
});

export function DeparturePDF({ data, isDocking }: DeparturePDFProps) {
  const { t } = useTranslation();
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with QR codes */}
        <View style={styles.headerRow}>
          <View style={styles.qrBox}>
            {data.form_qr_url ? (
              <Image src={data.form_qr_url} style={{ width: 50, height: 50 }} />
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
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>
            {t("departure.number_of_crew_members_crews")}:
          </Text>
          <Text style={styles.valueBox}>{data.number_of_crew}</Text>
        </View>
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
