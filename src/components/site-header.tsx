import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { Bell, LogOut, QrCode } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useNavigate } from "react-router-dom";
import { LanguageToggle } from "./ui/language-toggle";
import { NavUser } from "./nav-user";
import { useAuth } from "@/contexts/AuthContext";
import NotificationDropdown from "./NotificationDropdown";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Database } from "@/integrations/supabase/types";
export function SiteHeader({ title }: { title: string }) {
  const { user } = useAuth();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const [vessels, setVessels] = useState<
    Database["public"]["Tables"]["vessels"]["Row"][]
  >([]);
  const [defaultVessel, setDefaultVessel] = useState<string | null>(null);

  const data = {
    user: {
      id: user?.auth_id || "",
      name: user?.name || "",
      email: user?.email || "",
      avatar: "",
      vessel_id: defaultVessel || "",
    },
  };

  useEffect(() => {
    if (user) {
      fetchVessels();
      setDefaultVessel(
        vessels.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]?.registration_number || ""
      );
    }
  }, [user]);

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
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  }

  return (
    <header className="bg-[#001c5c] text-white group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />

        <NavUser isDisabledMenu={true} />

        <div className="ml-auto flex items-center justify-end gap-2">
          <NotificationDropdown />

          {/* QR Scanner Button */}
          <Button
            onClick={() => {
              // This will be handled by the parent component
              // For now, we'll navigate to a QR scanner page
              navigate("/qr-scanner");
            }}
            variant="outline"
            className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            size="sm"
          >
            <QrCode className="mr-2 h-4 w-4" />
            Scan QR
          </Button>

          {isMobile && (
            <Button
              onClick={() => {
                logout();
                navigate("/");
              }}
              variant="outline"
              className="bg-white text-blue-800 hidden md:flex ml-2"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
