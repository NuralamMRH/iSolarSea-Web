import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/stores/language-store";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { useTranslation } from "@/hooks/use-translation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

interface CrewMember {
  id: string;
  name: string;
  position: string;
  id_card: string;
  phone: string;
  id_card_front: string;
  id_card_back: string;
}

interface Vessel {
  id: string;
  name: string;
  type: string;
  registration_number: string;
  captain_name: string | null;
  owner_name: string | null;
  capacity: number | null;
  length: number | null;
  width: number | null;
  engine_power: string | null;
  crew_count: number | null;
  fishing_method: string | null;
  fishing_gear: Record<string, boolean>;
  created_at: string;
}

export default function VesselInfoPage() {
  const { id } = useParams<{ id: string }>();
  const [vessel, setVessel] = useState<Vessel | null>(null);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguageStore();
  const { t } = useTranslation();
  const vesselUrl = `${window.location.origin}/vessel/${id}`;

  useEffect(() => {
    const fetchVessel = async () => {
      setLoading(true);
      setError(null);
      // Fetch vessel by registration_number
      const { data: vessels, error: vesselError } = await supabase
        .from("vessels")
        .select("*")
        .eq("id", id)
        .limit(1);
      if (vesselError || !vessels || vessels.length === 0) {
        setError(t("vesselInfo.not_found") || "Vessel not found");
        setLoading(false);
        return;
      }
      const v = vessels[0];
      setVessel({
        id: v.id,
        name: v.name,
        type: v.type,
        registration_number: v.registration_number,
        captain_name: v.captain_name ?? null,
        owner_name: v.owner_name ?? null,
        capacity: v.capacity ?? null,
        length: v.length ?? null,
        width: v.width ?? null,
        engine_power: v.engine_power ?? null,
        crew_count: v.crew_count ?? null,
        fishing_method: v.fishing_method ?? null,
        fishing_gear: v.fishing_gear ?? {
          purse_seine: false,
          hook: false,
          net: false,
          trawl: false,
        },
        created_at: v.created_at,
      });
      // Fetch crew members
      const { data: crewData } = await supabase
        .from("crew_members")
        .select("*")
        .eq("vessel_id", vessels[0].id);
      setCrew(
        (crewData || []).map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: (c.name as string) ?? "",
          position: (c.position as string) ?? "",
          id_card: (c.id_card as string) ?? "",
          phone: (c.phone as string) ?? "",
          id_card_front: (c.id_card_front as string) ?? "",
          id_card_back: (c.id_card_back as string) ?? "",
        }))
      );
      setLoading(false);
    };
    if (id) fetchVessel();
    // eslint-disable-next-line
  }, [id, language]);

  const handleDownload = async () => {
    if (!vessel) return;
    const doc = new jsPDF();
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(vesselUrl, { width: 80 });
    doc.addImage(qrDataUrl, "PNG", 10, 10, 30, 30);
    doc.setFontSize(20);
    doc.text(t("vesselInfo.title") || "Vessel Information", 70, 20);
    doc.setFontSize(12);
    let y = 80;
    doc.text(`${t("vesselInfo.name") || "Name"}: ${vessel.name}`, 10, y);
    y += 8;
    doc.text(
      `${t("vesselInfo.registration_number") || "Registration Number"}: ${
        vessel.registration_number
      }`,
      10,
      y
    );
    y += 8;
    doc.text(`${t("vesselInfo.type") || "Type"}: ${vessel.type}`, 10, y);
    y += 8;
    doc.text(
      `${t("vesselInfo.captain_name") || "Captain Name"}: ${
        vessel.captain_name ?? "-"
      }`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.owner_name") || "Owner Name"}: ${
        vessel.owner_name ?? "-"
      }`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.capacity") || "Capacity"}: ${vessel.capacity ?? "-"}`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.length") || "Length"}: ${vessel.length ?? "-"} m`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.width") || "Width"}: ${vessel.width ?? "-"} m`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.engine_power") || "Engine Power"}: ${
        vessel.engine_power ?? "-"
      }`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.fishing_method") || "Fishing Method"}: ${
        vessel.fishing_method ?? "-"
      }`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.fishing_gear") || "Fishing Gear"}: ${
        Object.entries(vessel.fishing_gear)
          .filter(([_, v]) => v)
          .map(([k]) => k)
          .join(", ") || "-"
      }`,
      10,
      y
    );
    y += 8;
    doc.text(
      `${t("vesselInfo.crew_count") || "Crew Count"}: ${
        vessel.crew_count ?? "-"
      }`,
      10,
      y
    );
    y += 12;
    doc.text(t("vesselInfo.crew_members") || "Crew Members:", 10, y);
    y += 8;
    if (crew.length > 0) {
      crew.forEach((c, idx) => {
        doc.text(`${idx + 1}. ${c.name} (${c.position}) - ${c.phone}`, 12, y);
        y += 7;
        if (y > 270) {
          doc.addPage();
          y = 10;
        }
      });
    } else {
      doc.text(t("vesselInfo.no_crew") || "No crew info", 12, y);
    }
    doc.save(`${vessel.name || "vessel"}.pdf`);
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={language === "en" ? "Vessel Data" : "Dữ liệu tàu"} />
        <div className="w-full mx-auto mt-8 p-6">
          <div className="mb-4 flex justify-end">
            <Button onClick={handleDownload}>
              {t("vesselInfo.download") || "Download PDF"}
            </Button>
          </div>
          {loading ? (
            <div className="text-center py-10">
              {t("vesselInfo.loading") || "Loading..."}
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : vessel ? (
            <Card>
              <CardHeader>
                <CardTitle>{vessel.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <strong>
                    {t("vesselInfo.registration_number") ||
                      "Registration Number"}
                    :
                  </strong>{" "}
                  {vessel.registration_number}
                </div>
                <div className="mb-2">
                  <strong>{t("vesselInfo.type") || "Type"}:</strong>{" "}
                  {vessel.type}
                </div>
                <div className="mb-2">
                  <strong>{t("vesselInfo.captain_name") || "Captain"}:</strong>{" "}
                  {vessel.captain_name || "-"}
                </div>
                <div className="mb-2">
                  <strong>{t("vesselInfo.owner_name") || "Owner"}:</strong>{" "}
                  {vessel.owner_name || "-"}
                </div>
                <div className="mb-2">
                  <strong>{t("vesselInfo.capacity") || "Capacity"}:</strong>{" "}
                  {vessel.capacity || "-"}
                </div>
                <div className="mb-2">
                  <strong>{t("vesselInfo.length") || "Length"}:</strong>{" "}
                  {vessel.length || "-"} m
                </div>
                <div className="mb-2">
                  <strong>{t("vesselInfo.width") || "Width"}:</strong>{" "}
                  {vessel.width || "-"} m
                </div>
                <div className="mb-2">
                  <strong>
                    {t("vesselInfo.engine_power") || "Engine Power"}:
                  </strong>{" "}
                  {vessel.engine_power || "-"}
                </div>
                <div className="mb-2">
                  <strong>
                    {t("vesselInfo.fishing_method") || "Fishing Method"}:
                  </strong>{" "}
                  {vessel.fishing_method || "-"}
                </div>
                <div className="mb-2">
                  <strong>
                    {t("vesselInfo.fishing_gear") || "Fishing Gear"}:
                  </strong>{" "}
                  {Object.entries(vessel.fishing_gear)
                    .filter(([_, v]) => v)
                    .map(([k]) => k)
                    .join(", ") || "-"}
                </div>
                <div className="mb-2">
                  <strong>{t("vesselInfo.crew_count") || "Crew Count"}:</strong>{" "}
                  {vessel.crew_count || "-"}
                </div>
                <div className="mt-6">
                  <h3 className="font-bold mb-2">
                    {t("vesselInfo.crew_members") || "Crew Members"}
                  </h3>
                  {crew.length === 0 ? (
                    <div>
                      {t("vesselInfo.no_crew") || "No crew members found."}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t("vesselInfo.crew_name") || "Name"}
                          </TableHead>
                          <TableHead>
                            {t("vesselInfo.crew_position") || "Position"}
                          </TableHead>
                          <TableHead>
                            {t("vesselInfo.crew_id_card") || "ID Card"}
                          </TableHead>
                          <TableHead>
                            {t("vesselInfo.crew_phone") || "Phone"}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {crew.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.position}</TableCell>
                            <TableCell>{c.id_card}</TableCell>
                            <TableCell>{c.phone}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
