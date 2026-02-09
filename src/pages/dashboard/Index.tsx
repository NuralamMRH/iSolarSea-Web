import { AppSidebar } from "@/components/app-sidebar";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { useLanguageStore } from "@/stores/language-store";

import FleetBarChart from "@/components/dashboard/fleet/FleetBarChart";
import RegionBasedFleet from "@/components/dashboard/fleet/RegionBasedFleet";
import { Plus } from "lucide-react";
import TopButtons from "@/components/top-buttons";
import VesselsFilter from "@/components/dashboard/fleet/VesselsFilter";
import FleetRecords from "@/components/dashboard/fleet/FleetRecords";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Page() {
  const { language, country } = useLanguageStore();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/vessel-management/data`);
  }, [country, navigate]);

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title={language === "en" ? "Dashboard" : "Bảng điều khiển"}
        />

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <TopButtons />

              <div>
                <div className="vessel-list-container">
                  {/* <!-- thông tin tài khoản  --> */}

                  {/* <!-- Fishing Fleet Statistics --> */}
                  <FleetBarChart />

                  {/* <!-- Vietnam Map with Regions --> */}

                  <RegionBasedFleet />

                  <VesselsFilter />

                  {/* <!-- Fleet Fishing Records --> */}
                  <FleetRecords />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
