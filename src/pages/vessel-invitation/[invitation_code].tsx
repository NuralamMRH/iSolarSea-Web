import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth-store";
import { useToast } from "../../hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";
import {
  VesselAccessInvitation,
  VesselAccessRole,
} from "../../types/vessel-access";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Ship,
} from "lucide-react";

type InvitationStep =
  | "loading"
  | "error"
  | "expired"
  | "accepted"
  | "accept"
  | "login_required";

interface VesselData {
  id: string;
  name: string;
  registration_number: string;
  type: string;
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

export default function VesselInvitationPage() {
  const { invitationCode } = useParams<{ invitationCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [step, setStep] = useState<InvitationStep>("loading");
  const [invitation, setInvitation] = useState<VesselAccessInvitation | null>(
    null
  );
  const [vessel, setVessel] = useState<VesselData | null>(null);
  const [loading, setLoading] = useState(false);

  // Debug URL parameters
  console.log("=== URL PARAMETER DEBUG ===");
  console.log("useParams result:", useParams());
  console.log("invitationCode from useParams:", invitationCode);
  console.log("window.location.pathname:", window.location.pathname);
  console.log("window.location.search:", window.location.search);

  useEffect(() => {
    console.log("VesselInvitationPage mounted with code:", invitationCode);

    // Check if invitationCode is undefined and try to extract it from URL
    let code = invitationCode;
    if (!code) {
      // Try to extract from URL path
      const pathParts = window.location.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 10) {
        // UUIDs are longer than 10 chars
        code = lastPart;
        console.log("Extracted code from URL path:", code);
      }
    }

    if (code) {
      console.log("Using invitation code:", code);
      fetchInvitation(code);
      // Also test direct database access
      testDatabaseAccess(code);
    } else {
      console.error("No invitation code provided");
      setStep("error");
    }
  }, [invitationCode]);

  const testDatabaseAccess = async (code: string) => {
    try {
      console.log("=== TESTING DATABASE ACCESS ===");
      console.log("Testing with code:", code);

      // Test 1: Check if we can access the table at all
      const { data: testData, error: testError } = await supabase
        .from("vessel_access_invitations")
        .select("id")
        .limit(1);

      console.log("Test 1 - Can access table:", { testData, testError });

      // Test 2: Try to count all invitations
      const { count, error: countError } = await supabase
        .from("vessel_access_invitations")
        .select("*", { count: "exact", head: true });

      console.log("Test 2 - Total invitations count:", { count, countError });

      // Test 3: Try the function
      const { data: funcData, error: funcError } = await supabase.rpc(
        "get_invitation_by_code",
        { invitation_code_param: code }
      );

      console.log("Test 3 - Function result:", { funcData, funcError });
    } catch (error) {
      console.error("Database access test failed:", error);
    }
  };

  const fetchInvitation = async (code: string) => {
    try {
      setLoading(true);
      console.log("=== DEBUGGING INVITATION FETCH ===");
      console.log("1. Invitation code:", code);
      console.log("2. User logged in:", !!user);
      console.log("3. User email:", user?.email);

      // Try to fetch invitation directly
      console.log("4. Attempting direct query...");
      const { data: invitationData, error: invitationError } = await supabase
        .from("vessel_access_invitations")
        .select("*")
        .eq("invitation_code", code)
        .single();

      console.log("5. Direct query result:", {
        data: invitationData,
        error: invitationError,
        errorCode: invitationError?.code,
        errorMessage: invitationError?.message,
      });

      let invitation = invitationData;

      if (invitationError) {
        console.error("6. Direct query failed:", invitationError);

        // If it's an RLS issue, try using the function
        if (
          invitationError.code === "PGRST200" ||
          invitationError.message?.includes("policy")
        ) {
          console.log("7. RLS policy issue detected, trying function approach");

          // Try to fetch using the database function
          console.log("8. Calling get_invitation_by_code function...");
          const { data: functionData, error: functionError } =
            await supabase.rpc("get_invitation_by_code", {
              invitation_code_param: code,
            });

          console.log("9. Function query result:", {
            data: functionData,
            error: functionError,
            dataLength: functionData?.length,
            firstItem: functionData?.[0],
          });

          if (functionError) {
            console.error("10. Function also failed:", functionError);
            toast({
              title: "Access Issue",
              description:
                "There's a database access issue. Please contact the vessel owner to resend the invitation.",
              variant: "destructive",
            });
            setStep("error");
            return;
          }

          if (functionData && functionData.length > 0) {
            invitation = functionData[0];
            console.log("11. Invitation found via function:", invitation);
          } else {
            console.error("12. No invitation found via function");
            console.log("13. Function returned:", functionData);
            setStep("error");
            return;
          }
        } else {
          console.log("14. Not an RLS issue, setting error step");
          setStep("error");
          return;
        }
      }

      if (!invitation) {
        console.error("15. No invitation data found");
        setStep("error");
        return;
      }

      console.log("16. Setting invitation state:", invitation);
      setInvitation(invitation);

      // Check if invitation has expired
      console.log("17. Checking expiration...");
      console.log("18. Expires at:", invitation.expires_at);
      console.log("19. Current time:", new Date().toISOString());
      console.log(
        "20. Is expired:",
        new Date(invitation.expires_at) < new Date()
      );

      if (new Date(invitation.expires_at) < new Date()) {
        console.log("21. Invitation expired");
        setStep("expired");
        return;
      }

      // Check if already accepted
      console.log("22. Checking if already accepted:", invitation.is_accepted);
      if (invitation.is_accepted) {
        console.log("23. Invitation already accepted");
        setStep("accepted");
        return;
      }

      // Fetch vessel details
      console.log(
        "24. Fetching vessel details for vessel_id:",
        invitation.vessel_id
      );
      const { data: vesselData, error: vesselError } = await supabase
        .from("vessels")
        .select("*")
        .eq("id", invitation.vessel_id)
        .single();

      console.log("25. Vessel query result:", { vesselData, vesselError });

      if (vesselError) {
        console.error("26. Error fetching vessel:", vesselError);
      } else {
        setVessel(vesselData);
        console.log("27. Vessel found:", vesselData);
      }

      // Check if user is logged in
      if (!user) {
        console.log("28. User not logged in");
        setStep("login_required");
        return;
      }

      console.log("29. User logged in:", user.email);
      console.log("30. Invitation email:", invitation.email);

      // Check if user email matches invitation email
      if (user.email !== invitation.email) {
        console.log("31. Email mismatch:", user.email, "!=", invitation.email);
        setStep("error");
        return;
      }

      console.log("32. All checks passed, showing accept step");
      setStep("accept");
    } catch (error) {
      console.error("33. Unexpected error in fetchInvitation:", error);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) return;

    try {
      setLoading(true);

      // Use the database function to accept invitation securely
      const { data: result, error: functionError } = await supabase.rpc(
        "accept_vessel_invitation",
        {
          invitation_id_param: invitation.id,
          user_id_param: user.auth_id,
        }
      );

      if (functionError) {
        console.error(
          "Error calling accept_vessel_invitation function:",
          functionError
        );
        throw functionError;
      }

      if (result && result.length > 0) {
        const { success, message } = result[0];

        if (success) {
          setStep("accepted");
          toast({
            title: "Success",
            description:
              message === "Invitation already accepted"
                ? "You already have access to this vessel."
                : "Vessel access granted successfully!",
            variant: "default",
          });
        } else {
          toast({
            title: "Error",
            description: message,
            variant: "destructive",
          });
        }
      } else {
        throw new Error("No result from accept_vessel_invitation function");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);

      // Provide specific error messages based on error codes
      if (error.code === "23505") {
        toast({
          title: "Access Already Exists",
          description:
            "You already have access to this vessel. The invitation has been marked as accepted.",
          variant: "default",
        });
        setStep("accepted");
      } else if (error.code === "42501") {
        toast({
          title: "Permission Error",
          description:
            "There was a permission issue. Please contact the vessel owner to grant access manually.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to accept invitation. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: VesselAccessRole) => {
    switch (role) {
      case "owner":
        return "bg-red-100 text-red-800";
      case "moderator":
        return "bg-orange-100 text-orange-800";
      case "captain":
        return "bg-blue-100 text-blue-800";
      case "crew_member":
        return "bg-green-100 text-green-800";
      case "editor":
        return "bg-purple-100 text-purple-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      view_basic_info: "View Basic Info",
      view_detailed_info: "View Detailed Info",
      view_catch_records: "View Catch Records",
      view_trips: "View Trips",
      view_crew: "View Crew",
      view_locations: "View Locations",
      edit_basic_info: "Edit Basic Info",
      edit_detailed_info: "Edit Detailed Info",
      edit_catch_records: "Edit Catch Records",
      edit_trips: "Edit Trips",
      edit_crew: "Edit Crew",
      manage_access: "Manage Access",
      delete_vessel: "Delete Vessel",
      full_access: "Full Access",
    };
    return labels[permission] || permission;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {step === "loading" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <CardTitle>Loading Invitation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Please wait while we load your invitation...
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {step === "error" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-6 w-6" />
                <CardTitle>Invalid Invitation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                This invitation is invalid or has been cancelled.
              </CardDescription>
              <Button className="w-full mt-4" onClick={() => navigate("/")}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "expired" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="h-6 w-6" />
                <CardTitle>Invitation Expired</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                This invitation has expired. Please contact the vessel owner for
                a new invitation.
              </CardDescription>
              <Button className="w-full mt-4" onClick={() => navigate("/")}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "accepted" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6" />
                <CardTitle>Access Granted</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                You have successfully been granted access to the vessel.
              </CardDescription>
              <Button
                className="w-full mt-4"
                onClick={() => navigate(`/vessel-management/data`)}
              >
                View Vessel
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "login_required" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-blue-600">
                <Users className="h-6 w-6" />
                <CardTitle>Login Required</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Please log in to accept this vessel invitation.
              </CardDescription>
              <Button
                className="w-full mt-4"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "accept" && invitation && vessel && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-blue-600">
                <Ship className="h-6 w-6" />
                <CardTitle>Vessel Access Invitation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{vessel.name}</h3>
                <p className="text-sm text-gray-600">
                  Registration: {vessel.registration_number}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Your Role</h4>
                <Badge className={getRoleColor(invitation.role)}>
                  {invitation.role}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">Permissions</h4>
                <div className="flex flex-wrap gap-1">
                  {invitation.permissions.map((permission) => (
                    <Badge
                      key={permission}
                      variant="secondary"
                      className="text-xs"
                    >
                      {getPermissionLabel(permission)}
                    </Badge>
                  ))}
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  By accepting this invitation, you will be granted access to
                  view and manage this vessel's data according to your assigned
                  permissions.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/")}
                >
                  Decline
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAcceptInvitation}
                  disabled={loading}
                >
                  {loading ? "Accepting..." : "Accept Invitation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fallback for any unexpected state */}
        {!step ||
          (step !== "loading" &&
            step !== "error" &&
            step !== "expired" &&
            step !== "accepted" &&
            step !== "login_required" &&
            step !== "accept" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 text-gray-600">
                    <AlertCircle className="h-6 w-6" />
                    <CardTitle>Unexpected State</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    An unexpected error occurred. Please try again or contact
                    support.
                  </CardDescription>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-600">Debug Info:</p>
                    <p className="text-xs text-gray-500">Step: {step}</p>
                    <p className="text-xs text-gray-500">
                      Invitation Code: {invitationCode}
                    </p>
                    <p className="text-xs text-gray-500">
                      User: {user?.email || "Not logged in"}
                    </p>
                  </div>
                  <Button className="w-full mt-4" onClick={() => navigate("/")}>
                    Go Home
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
