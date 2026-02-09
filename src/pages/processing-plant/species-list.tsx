import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { useEffect, useState, useMemo } from "react";
import { getCurrentUser, supabase } from "@/lib/supabase";
import { toDataURL } from "qrcode";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { DeparturePDF } from "@/components/dashboard/DeparturePDF"; // adjust path as needed
import { useTranslation } from "@/hooks/use-translation";
import { useAuthStore } from "@/stores/auth-store";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import CompanyForm from "@/components/dashboard/CompanyForm";

// Type for a seaport row
const initialForm = {
  vessel_id: "",
  owner: "",
  address: "",
  crew_count: "",
  vessel_type: "",
  departure_port: "",
  departure_province: "",
  to_region: "",
  place_of_departure: "",
  departure_date: "",
  trip_period: "",
  status: "Docking",
  number_of_crew: 0,
  vessel_registration_number: "",
  dock_province: "",
  place_of_dock: "",
  docking_date: "",
  total_trip_period: 0,
};
function getDaysBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
}
// Type for joined catch record with haul info
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
  net_kg_per_case: string | number;
}
// Type for product order (define locally if not in types)
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
}

export default function ProcessingPlantSpeciesList() {
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={language === "en" ? "2Share Loading" : "Chuyển tải"}
        />
        <TopButtons />
        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
          <Link
            to="/processing-plant/company-profile"
            className="flex-shrink-0"
          >
            <button
              className={`
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40
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
              className={`
                bg-gradient-to-r from-[#a8a8a8] to-[#fdfdfd] text-black  rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40 shadow-lg hover:shadow-xl transition-all duration-300
              `}
            >
              <span className="truncate">
                {language === "en" ? "Transaction" : "Giao dịch"}
              </span>
            </button>
          </Link>
        </div>
        <div className="mt-8 bg-[#d6e6ed] p-4 rounded-lg m-3">
          <h2 className="text-center font-bold text-lg mb-2">
            TIÊU CHUẨN QUỐC GIA
            <br />
            TCVN 13981:2024
          </h2>
          <h3 className="text-center font-bold mb-1">
            DANH MỤC LOÀI VÀ NHÓM LOÀI THƯƠNG PHẨM CỦA NGHỀ KHAI THÁC THỦY SẢN
          </h3>
          <p className="text-center mb-4">
            List of commercial species and species groups of fisheries
          </p>
          <Table className="border-2 border-black">
            <TableHeader>
              <TableRow>
                <TableHead className="border-2 border-black text-center">
                  Scan
                </TableHead>
                <TableHead className="border-2 border-black text-center">
                  Hình
                </TableHead>
                <TableHead className="border-2 border-black text-center">
                  Danh mục loài cá
                </TableHead>
                <TableHead className="border-2 border-black text-center">
                  F.P / ID
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Example Row 1 */}
              <TableRow>
                <TableCell className="border-2 border-black text-center">
                  <div className="flex flex-col items-center">
                    <span
                      role="img"
                      aria-label="camera"
                      className="text-3xl mb-1"
                    >
                      📷
                    </span>
                    <span className="font-bold">
                      SCAN
                      <br />
                      ME
                    </span>
                  </div>
                </TableCell>
                <TableCell className="border-2 border-black text-center">
                  <img
                    src="https://cttf.uk/wp-content/uploads/2021/04/TunaFish-1.png"
                    alt="Fish"
                    className="w-24 h-16 object-contain mx-auto"
                  />
                </TableCell>
                <TableCell className="border-2 border-black">
                  <div>
                    <b>Tên tiếng Việt:</b> Cá ngừ bò.
                    <br />
                    Tên gọi khác: Cá ù bò, cá ù chằng.
                    <br />
                    <b>Tên khoa học:</b> Thunnus tonggol (Bleeker 1851).
                    <br />
                    Tên tiếng Anh: Longtail tuna.
                    <br />
                    <b>Kích thước (size):</b>
                    <br />
                    Mã 3α: LOT.
                  </div>
                </TableCell>
                <TableCell className="border-2 border-black text-center align-middle font-bold">
                  The ID to be issued
                  <br />
                  by Government
                </TableCell>
              </TableRow>
              {/* Example Row 2 */}
              <TableRow>
                <TableCell className="border-2 border-black text-center">
                  <div className="flex flex-col items-center">
                    <span
                      role="img"
                      aria-label="camera"
                      className="text-3xl mb-1"
                    >
                      📷
                    </span>
                    <span className="font-bold">
                      SCAN
                      <br />
                      ME
                    </span>
                  </div>
                </TableCell>
                <TableCell className="border-2 border-black text-center">
                  <img
                    src="https://cttf.uk/wp-content/uploads/2021/04/TunaFish-1.png"
                    alt="Fish"
                    className="w-24 h-16 object-contain mx-auto"
                  />
                </TableCell>
                <TableCell className="border-2 border-black">
                  <div>
                    <b>Tên tiếng Việt:</b>
                    <br />
                    Tên gọi khác:
                    <br />
                    <b>Tên khoa học:</b>
                    <br />
                    Tên tiếng Anh:
                    <br />
                    <b>Kích thước (size):</b>
                    <br />
                    Mã 3α:
                  </div>
                </TableCell>
                <TableCell className="border-2 border-black text-center align-middle font-bold">
                  The ID to be issued
                  <br />
                  by Government
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
