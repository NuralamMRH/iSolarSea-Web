import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import TopButtons from "@/components/top-buttons";

export default function ProcessingPlantInfo() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Info" />
        <TopButtons />
        <div className="p-8">Demo content for /processing-plant/info</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
