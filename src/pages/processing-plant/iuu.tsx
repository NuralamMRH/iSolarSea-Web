import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";
import { Link } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { useIsMobile } from "@/hooks/use-mobile";

import IuuSummaryRecords from "@/components/dashboard/IuuSummaryRecords";

export default function Iuu() {
  const { language } = useLanguageStore();
  const isMobile = useIsMobile();
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={language === "en" ? "4Share Loading" : "Nhận Tải"} />
        <TopButtons />

        <div className="px-3 flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto">
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
                bg-gradient-to-r from-black to-[#1306ad] text-[#f8f603] rounded-md px-4 md:px-5
                h-8 md:h-10 flex items-center justify-center text-center whitespace-nowrap
                text-xs md:text-base
                w-32 md:w-36 lg:w-40
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
        <div className="flex flex-row gap-2 justify-center my-5">
          <h2 className="text-2lg font-bold text-blue-500">
            BÁO CÁO TỔNG HỢP THEO TÀU
          </h2>
        </div>
        <IuuSummaryRecords isVesselGrouped={true} />
        <div className="flex flex-row gap-2 justify-center my-5">
          <h2 className="text-2lg font-bold text-blue-500">
            BÁO CÁO TỔNG HỢP THEO SẢN PHẨM
          </h2>
        </div>
        <IuuSummaryRecords isVesselGrouped={false} />
      </SidebarInset>
    </SidebarProvider>
  );
}
