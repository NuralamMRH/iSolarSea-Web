import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/auth-store";
import { useToast } from "../../hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";
import { useVesselAccess } from "../../hooks/use-vessel-access";
import VesselAccessManager from "../../components/vessel-access/VesselAccessManager";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  AlertCircle,
  Ship,
  Users,
  Mail,
  UserPlus,
  Shield,
  Settings,
  Search,
} from "lucide-react";

interface Vessel {
  id: string;
  name: string;
  registration_number: string;
  type: string;
  user_id: string;
  captain_name?: string;
  capacity?: number;
  length?: number;
  width?: string;
  engine_power?: string;
  crew_count?: number;
  fishing_method?: string;
  owner_name?: string;
  fishery_permit?: string;
  expiration_date?: string;
  image_url?: string;
  latitude?: string;
  longitude?: string;
  created_at: string;
}

interface VesselAccessSummary {
  vessel_id: string;
  vessel_name: string;
  total_users: number;
  active_users: number;
  pending_invitations: number;
  owner_id: string;
  owner_name: string;
}

export default function AccessManager() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "owned" | "delegated">(
    "all"
  );

  // Access data for selected vessel - always call the hook but it will handle null vesselId
  const vesselAccess = useVesselAccess(selectedVessel?.id || "");

  useEffect(() => {
    if (user && user.auth_id) {
      console.log("User authenticated, fetching vessels...");
      fetchVessels();
    } else {
      console.log("User not authenticated or missing auth_id");
      setLoading(false);
    }
  }, [user]);

  const fetchVessels = async () => {
    try {
      setLoading(true);
      console.log("Fetching vessels for user:", user?.auth_id);

      // TEMPORARY: For testing, fetch all vessels first
      const { data: allVesselsData, error: allVesselsError } = await supabase
        .from("vessels")
        .select("*")
        .limit(10);

      if (allVesselsError) {
        console.error("Error fetching all vessels:", allVesselsError);
      } else {
        console.log("All vessels in database:", allVesselsData);
      }

      // First, get vessels that the user owns
      const { data: ownedVessels, error: ownedError } = await supabase
        .from("vessels")
        .select("*")
        .eq("user_id", user?.auth_id)
        .order("name");

      if (ownedError) {
        console.error("Error fetching owned vessels:", ownedError);
        throw ownedError;
      }
      console.log("Owned vessels:", ownedVessels);

      // Then, get vessels that the user has access to through vessel_access_control
      const { data: accessControlData, error: accessError } = await supabase
        .from("vessel_access_control")
        .select("vessel_id")
        .eq("user_id", user?.auth_id)
        .eq("is_active", true);

      if (accessError) {
        console.error("Error fetching access control data:", accessError);
        // Don't throw error for access control, as the table might not exist yet
        console.log(
          "Access control table might not exist yet, continuing with owned vessels only"
        );
      }
      console.log("Access control data:", accessControlData);

      // Get the vessel IDs that the user has access to
      const delegatedVesselIds =
        accessControlData?.map((item) => item.vessel_id) || [];
      console.log("Delegated vessel IDs:", delegatedVesselIds);

      // Fetch the delegated vessels
      let delegatedVessels: Vessel[] = [];
      if (delegatedVesselIds.length > 0) {
        const { data: delegatedData, error: delegatedError } = await supabase
          .from("vessels")
          .select("*")
          .in("id", delegatedVesselIds)
          .order("name");

        if (delegatedError) {
          console.error("Error fetching delegated vessels:", delegatedError);
          throw delegatedError;
        }
        delegatedVessels = delegatedData || [];
        console.log("Delegated vessels:", delegatedVessels);
      }

      // Combine owned and delegated vessels, removing duplicates
      const allVessels = [...(ownedVessels || []), ...delegatedVessels];
      const uniqueVessels = allVessels.filter(
        (vessel, index, self) =>
          index === self.findIndex((v) => v.id === vessel.id)
      );

      console.log("Final vessels list:", uniqueVessels);
      setVessels(uniqueVessels);

      // If no vessels found, try to fetch all vessels to see if the table exists
      if (uniqueVessels.length === 0) {
        console.log(
          "No vessels found for user, checking if vessels table has data..."
        );
        const { data: allVesselsData, error: allVesselsError } = await supabase
          .from("vessels")
          .select("id, name, user_id")
          .limit(5);

        if (allVesselsError) {
          console.error("Error fetching all vessels:", allVesselsError);
        } else {
          console.log("Sample vessels in database:", allVesselsData);
        }
      }
    } catch (error) {
      console.error("Error fetching vessels:", error);
      toast({
        title: "Error",
        description: "Failed to load vessels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const filteredVessels = vessels.filter((vessel) => {
    const matchesSearch =
      vessel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vessel.registration_number
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    if (filterType === "owned") {
      return matchesSearch && vessel.user_id === user?.auth_id;
    } else if (filterType === "delegated") {
      return matchesSearch && vessel.user_id !== user?.auth_id;
    }

    return matchesSearch;
  });

  const handleVesselSelect = (vessel: Vessel) => {
    setSelectedVessel(vessel);
  };

  const getVesselTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "fishing":
        return "bg-blue-100 text-blue-800";
      case "cargo":
        return "bg-green-100 text-green-800";
      case "passenger":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAccessLevel = (vessel: Vessel) => {
    if (vessel.user_id === user?.auth_id) {
      return { level: "Owner", color: "bg-green-100 text-green-800" };
    } else {
      return { level: "Delegated", color: "bg-blue-100 text-blue-800" };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vessels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Access Manager</h1>
          <p className="text-gray-600 mt-2">
            Manage vessel access and delegate permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Vessels</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by vessel name or registration number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="filter">Filter</Label>
              <Select
                value={filterType}
                onValueChange={(value: "all" | "owned" | "delegated") =>
                  setFilterType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vessels</SelectItem>
                  <SelectItem value="owned">Owned Vessels</SelectItem>
                  <SelectItem value="delegated">Delegated Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vessel Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Select Vessel
              </CardTitle>
              <CardDescription>
                Choose a vessel to manage its access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredVessels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Ship className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No vessels found</p>
                  <p className="text-sm">Try adjusting your search or filter</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredVessels.map((vessel) => {
                    const accessLevel = getAccessLevel(vessel);
                    return (
                      <div
                        key={vessel.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedVessel?.id === vessel.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleVesselSelect(vessel)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">
                              {vessel.name}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {vessel.registration_number}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                className={getVesselTypeColor(vessel.type)}
                              >
                                {vessel.type}
                              </Badge>
                              <Badge className={accessLevel.color}>
                                {accessLevel.level}
                              </Badge>
                            </div>
                          </div>
                          {selectedVessel?.id === vessel.id && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Access Management */}
        <div className="lg:col-span-2">
          {selectedVessel ? (
            <div className="space-y-6">
              {/* Vessel Info Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Ship className="h-5 w-5" />
                        {selectedVessel.name}
                      </CardTitle>
                      <CardDescription>
                        Registration: {selectedVessel.registration_number} •
                        Type: {selectedVessel.type}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {vesselAccess?.isOwner && (
                        <Badge className="bg-green-100 text-green-800">
                          Owner
                        </Badge>
                      )}
                      {vesselAccess?.accessData && !vesselAccess.isOwner && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {vesselAccess.accessData.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Access Management Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="access">Access Control</TabsTrigger>
                  <TabsTrigger value="invitations">Invitations</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Access Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                          <div className="text-2xl font-bold text-blue-600">
                            {vesselAccess?.accessData ? "Active" : "No Access"}
                          </div>
                          <p className="text-sm text-gray-600">Access Status</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <div className="text-2xl font-bold text-green-600">
                            {vesselAccess?.accessData?.permissions?.length || 0}
                          </div>
                          <p className="text-sm text-gray-600">Permissions</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <Settings className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                          <div className="text-2xl font-bold text-purple-600">
                            {vesselAccess?.isOwner ? "Full" : "Limited"}
                          </div>
                          <p className="text-sm text-gray-600">Control Level</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Vessel Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            Basic Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Name:</span>
                              <span className="font-medium">
                                {selectedVessel.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Registration:
                              </span>
                              <span className="font-medium">
                                {selectedVessel.registration_number}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Type:</span>
                              <span className="font-medium">
                                {selectedVessel.type}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Captain:</span>
                              <span className="font-medium">
                                {selectedVessel.captain_name || "Not specified"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            Specifications
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Capacity:</span>
                              <span className="font-medium">
                                {selectedVessel.capacity || "Not specified"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Length:</span>
                              <span className="font-medium">
                                {selectedVessel.length || "Not specified"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Crew Count:</span>
                              <span className="font-medium">
                                {selectedVessel.crew_count || "Not specified"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Engine Power:
                              </span>
                              <span className="font-medium">
                                {selectedVessel.engine_power || "Not specified"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="access" className="space-y-4">
                  {vesselAccess?.canManageAccess() ? (
                    <VesselAccessManager
                      vesselId={selectedVessel.id}
                      vesselName={selectedVessel.name}
                      userPermissions={
                        vesselAccess.accessData?.permissions || []
                      }
                    />
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You don't have permission to manage access for this
                        vessel. Only vessel owners and moderators can manage
                        access permissions.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="invitations" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Invitation History
                      </CardTitle>
                      <CardDescription>
                        View and manage vessel access invitations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-gray-500">
                        <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>
                          Invitation management is available in the Access
                          Control tab
                        </p>
                        <p className="text-sm">
                          Switch to the Access Control tab to manage invitations
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Ship className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Vessel
                </h3>
                <p className="text-gray-600">
                  Choose a vessel from the list to manage its access permissions
                  and delegate access.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
