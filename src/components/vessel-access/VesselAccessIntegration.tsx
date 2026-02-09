import React from "react";
import { useVesselAccess } from "../../hooks/use-vessel-access";
import VesselAccessManager from "./VesselAccessManager";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertCircle, Shield, Users, Settings } from "lucide-react";

interface VesselAccessIntegrationProps {
  vesselId: string;
  vesselName: string;
  children?: React.ReactNode;
}

export default function VesselAccessIntegration({
  vesselId,
  vesselName,
  children,
}: VesselAccessIntegrationProps) {
  const {
    loading,
    isOwner,
    accessData,
    canViewBasicInfo,
    canViewDetailedInfo,
    canViewCatchRecords,
    canViewTrips,
    canViewCrew,
    canViewLocations,
    canEditBasicInfo,
    canEditCatchRecords,
    canEditTrips,
    canEditCrew,
    canManageAccess,
    canDeleteVessel,
  } = useVesselAccess(vesselId);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vessel access...</p>
        </div>
      </div>
    );
  }

  // If user has no access at all
  if (!canViewBasicInfo()) {
    return (
      <div className="p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view this vessel. Please contact the
            vessel owner for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Access Control Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle>Vessel Access Control</CardTitle>
            </div>
            {isOwner && (
              <Badge className="bg-green-100 text-green-800">Owner</Badge>
            )}
            {accessData && !isOwner && (
              <Badge className="bg-blue-100 text-blue-800">
                {accessData.role}
              </Badge>
            )}
          </div>
          <CardDescription>
            Manage access permissions and view vessel information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">
                View Permissions
              </h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canViewBasicInfo() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Basic Info</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canViewDetailedInfo() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Detailed Info</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canViewCatchRecords() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Catch Records</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canViewTrips() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Trips</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canViewCrew() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Crew</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canViewLocations() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Locations</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">
                Edit Permissions
              </h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canEditBasicInfo() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Basic Info</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canEditCatchRecords() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Catch Records</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canEditTrips() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Trips</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canEditCrew() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Crew</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">
                Admin Permissions
              </h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canManageAccess() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Manage Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      canDeleteVessel() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="text-sm">Delete Vessel</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Management Section */}
      {canManageAccess() && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Access Management</CardTitle>
            </div>
            <CardDescription>
              Manage who can access this vessel and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VesselAccessManager
              vesselId={vesselId}
              vesselName={vesselName}
              userPermissions={accessData?.permissions || []}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {children && <div className="space-y-4">{children}</div>}

      {/* Access Information */}
      {accessData && !isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <CardTitle>Access Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium">{accessData.role}</span>
              </div>
              {accessData.expires_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Access Expires:</span>
                  <span className="font-medium">
                    {new Date(accessData.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Permissions:</span>
                <span className="font-medium">
                  {accessData.permissions.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Example usage component
export function ExampleVesselPage({
  vesselId,
  vesselName,
}: {
  vesselId: string;
  vesselName: string;
}) {
  const {
    canViewBasicInfo,
    canViewDetailedInfo,
    canViewCatchRecords,
    canViewTrips,
    canEditBasicInfo,
  } = useVesselAccess(vesselId);

  return (
    <VesselAccessIntegration vesselId={vesselId} vesselName={vesselName}>
      {/* Vessel Basic Information */}
      {canViewBasicInfo() && (
        <Card>
          <CardHeader>
            <CardTitle>Vessel Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Basic vessel information here...</p>
            {canEditBasicInfo() && (
              <Button className="mt-4">Edit Vessel</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Information */}
      {canViewDetailedInfo() && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Detailed vessel information here...</p>
          </CardContent>
        </Card>
      )}

      {/* Catch Records */}
      {canViewCatchRecords() && (
        <Card>
          <CardHeader>
            <CardTitle>Catch Records</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Catch records information here...</p>
          </CardContent>
        </Card>
      )}

      {/* Trips */}
      {canViewTrips() && (
        <Card>
          <CardHeader>
            <CardTitle>Fishing Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Fishing trips information here...</p>
          </CardContent>
        </Card>
      )}
    </VesselAccessIntegration>
  );
}
