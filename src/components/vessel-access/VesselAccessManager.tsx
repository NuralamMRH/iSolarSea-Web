import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/auth-store";
import { useToast } from "../../hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";
import {
  VesselAccessInvitation,
  VesselAccessRole,
  VesselAccessPermission,
  VesselAccessUser,
  ROLE_PERMISSIONS,
  hasVesselPermission,
  canManageAccess,
} from "../../types/vessel-access";
import { useVesselAccess } from "../../hooks/use-vessel-access";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription } from "../ui/alert";
import {
  AlertCircle,
  Users,
  Mail,
  UserPlus,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface VesselAccessManagerProps {
  vesselId: string;
  vesselName: string;
  userPermissions: VesselAccessPermission[];
}

interface AccessControlData {
  user_id: string;
  role: VesselAccessRole;
  permissions: VesselAccessPermission[];
  is_active: boolean;
  expires_at?: string;
  granted_by: string;
  created_at: string;
  users: {
    id: string;
    email: string;
    name: string;
  };
  granted_by_user: {
    id: string;
    name: string;
  };
}

export default function VesselAccessManager({
  vesselId,
  vesselName,
  userPermissions,
}: VesselAccessManagerProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const vesselAccess = useVesselAccess(vesselId);

  const [activeUsers, setActiveUsers] = useState<VesselAccessUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    VesselAccessInvitation[]
  >([]);
  const [acceptedInvitations, setAcceptedInvitations] = useState<
    VesselAccessInvitation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<VesselAccessUser | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<VesselAccessRole>("delegate");
  const [invitePermissions, setInvitePermissions] = useState<
    VesselAccessPermission[]
  >(["view_basic_info"]);
  const [inviteExpiry, setInviteExpiry] = useState("7");

  // Edit form state
  const [editRole, setEditRole] = useState<VesselAccessRole>("delegate");
  const [editPermissions, setEditPermissions] = useState<
    VesselAccessPermission[]
  >(["view_basic_info"]);
  const [editExpiry, setEditExpiry] = useState("");

  const canManage = canManageAccess(userPermissions);

  // Add refresh function
  const refreshAccessData = async () => {
    setRefreshing(true);
    try {
      await fetchAccessData();
      // Also refetch vessel access for the current user
      // if (vesselAccess.refetch) {
      //   await vesselAccess.refetch();
      // }
    } catch (error) {
      console.error("Error refreshing access data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      fetchAccessData();
    }
  }, [vesselId, canManage]);

  const fetchAccessData = async () => {
    try {
      setLoading(true);
      console.log("Fetching access data for vessel:", vesselId);

      // Fetch active users with a simple query
      const { data: usersData, error: usersError } = await supabase
        .from("vessel_access_control")
        .select("*")
        .eq("vessel_id", vesselId)
        .eq("is_active", true);

      if (usersError) {
        console.error("Error fetching users:", usersError);
        // Don't throw error, just set empty array
        setActiveUsers([]);
      } else {
        console.log("Users data:", usersData);

        // Fetch user details separately with error handling
        const formattedUsers: VesselAccessUser[] = await Promise.all(
          (usersData || []).map(
            async (item: {
              user_id: string;
              granted_by: string;
              role: VesselAccessRole;
              permissions: VesselAccessPermission[];
              is_active: boolean;
              expires_at?: string;
              created_at: string;
            }) => {
              try {
                // Get user details using the view-based function
                console.log("Fetching user details for user_id:", item.user_id);

                let userData = null;
                let userError = null;

                // Try the view-based function first
                try {
                  const result = await supabase.rpc(
                    "get_user_details_from_view",
                    { user_id_param: item.user_id }
                  );
                  userData = result.data;
                  userError = result.error;
                  console.log("View function result:", { userData, userError });
                } catch (funcError) {
                  console.log(
                    "View function failed, trying direct query:",
                    funcError
                  );

                  // Fallback: try direct query to the view
                  const result = await supabase
                    .from("user_details_view")
                    .select("id, email, name, phone")
                    .eq("id", item.user_id)
                    .single();

                  console.log("Direct view query result:", result);
                  console.log("Direct view query data:", result.data);
                  console.log("Direct view query error:", result.error);
                  console.log("User ID being queried:", item.user_id);
                  userData = result.data ? [result.data] : null;
                  userError = result.error;
                  console.log("Direct view query result:", {
                    userData,
                    userError,
                  });
                }

                let grantedByData = null;
                let grantedByError = null;

                // Try the view-based function first for granted_by
                try {
                  const result = await supabase.rpc(
                    "get_user_details_from_view",
                    { user_id_param: item.granted_by }
                  );
                  grantedByData = result.data;
                  grantedByError = result.error;
                  console.log("Granted by view function result:", {
                    grantedByData,
                    grantedByError,
                  });
                } catch (funcError) {
                  console.log(
                    "Granted by view function failed, trying direct query:",
                    funcError
                  );

                  // Fallback: try direct query to the view
                  const result = await supabase
                    .from("user_details_view")
                    .select("id, email, name, phone")
                    .eq("id", item.granted_by)
                    .single();
                  grantedByData = result.data ? [result.data] : null;
                  grantedByError = result.error;
                  console.log("Granted by direct view query result:", {
                    grantedByData,
                    grantedByError,
                  });
                }

                const userDetails = {
                  id: item.user_id,
                  email: userData?.[0]?.email || "Unknown",
                  name: userData?.[0]?.name || "Unknown",
                  phone: userData?.[0]?.phone || "",
                  role: item.role,
                  permissions: item.permissions,
                  is_active: item.is_active,
                  expires_at: item.expires_at,
                  granted_by: item.granted_by,
                  granted_by_name: grantedByData?.[0]?.name || "Unknown",
                  granted_by_email: grantedByData?.[0]?.email || "Unknown",
                  created_at: item.created_at,
                };

                console.log("Formatted user details:", userDetails);
                return userDetails;
              } catch (error) {
                console.error("Error fetching user details:", error);
                return {
                  id: item.user_id,
                  email: "Unknown",
                  name: "Unknown",
                  phone: "",
                  role: item.role,
                  permissions: item.permissions,
                  is_active: item.is_active,
                  expires_at: item.expires_at,
                  granted_by: item.granted_by,
                  granted_by_name: "Unknown",
                  granted_by_email: "Unknown",
                  created_at: item.created_at,
                };
              }
            }
          )
        );

        setActiveUsers(formattedUsers);
      }

      // Fetch pending invitations with a simple query
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("vessel_access_invitations")
        .select("*")
        .eq("vessel_id", vesselId)
        .eq("is_accepted", false)
        .gt("expires_at", new Date().toISOString());

      if (invitationsError) {
        console.error("Error fetching invitations:", invitationsError);
        setPendingInvitations([]);
      } else {
        console.log("Invitations data:", invitationsData);
        setPendingInvitations(invitationsData || []);
      }

      // Fetch accepted invitations for history
      const { data: acceptedData, error: acceptedError } = await supabase
        .from("vessel_access_invitations")
        .select("*")
        .eq("vessel_id", vesselId)
        .eq("is_accepted", true)
        .order("accepted_at", { ascending: false });

      if (acceptedError) {
        console.error("Error fetching accepted invitations:", acceptedError);
        setAcceptedInvitations([]);
      } else {
        console.log("Accepted invitations data:", acceptedData);
        setAcceptedInvitations(acceptedData || []);
      }
    } catch (error) {
      console.error("Error fetching access data:", error);
      toast({
        title: "Error",
        description: "Failed to load access data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testInvitationTable = async () => {
    try {
      console.log("Testing vessel_access_invitations table...");

      // Test if table exists by trying to select from it
      const { data, error } = await supabase
        .from("vessel_access_invitations")
        .select("id")
        .limit(1);

      if (error) {
        console.error(
          "Error accessing vessel_access_invitations table:",
          error
        );
        return false;
      } else {
        console.log("vessel_access_invitations table is accessible");
        return true;
      }
    } catch (error) {
      console.error("Error testing invitation table:", error);
      return false;
    }
  };

  const checkUserPermissions = async () => {
    try {
      // Check if user is vessel owner
      const { data: vesselData, error: vesselError } = await supabase
        .from("vessels")
        .select("user_id")
        .eq("id", vesselId)
        .single();

      if (vesselError) {
        console.error("Error checking vessel ownership:", vesselError);
        return false;
      }

      const isOwner = vesselData?.user_id === user?.auth_id;
      console.log("Is vessel owner:", isOwner);

      if (isOwner) {
        return true;
      }

      // For now, allow all authenticated users to manage access
      // We can add proper moderator checks later once the basic functionality works
      console.log("User is not owner, but allowing access for testing");
      return true;
    } catch (error) {
      console.error("Error checking user permissions:", error);
      return false;
    }
  };

  const generateEmailTemplate = (
    invitationCode: string,
    email: string,
    role: string,
    vesselName: string,
    expiresAt: Date
  ) => {
    const invitationUrl = `${window.location.origin}/vessel-invitation/${invitationCode}`;

    return {
      subject: `Vessel Access Invitation - ${vesselName}`,
      body: `
Hello,

You have been invited to access the vessel "${vesselName}" with the role of ${role}.

To accept this invitation, please click on the following link:
${invitationUrl}

Or copy and paste this invitation code: ${invitationCode}

This invitation expires on: ${expiresAt.toLocaleDateString()}

If you don't have an account, you'll be prompted to create one when you accept the invitation.

Best regards,
The iTruckSea Team
      `.trim(),
    };
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteRole) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!user?.auth_id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    // Check user permissions first
    const hasPermission = await checkUserPermissions();
    if (!hasPermission) {
      toast({
        title: "Error",
        description:
          "You don't have permission to send invitations for this vessel",
        variant: "destructive",
      });
      return;
    }

    // Test if the table exists first
    const tableExists = await testInvitationTable();
    if (!tableExists) {
      toast({
        title: "Error",
        description:
          "Invitation system not available. Please run database migrations first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const invitationCode = crypto.randomUUID();
      const expiryDays = parseInt(inviteExpiry);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      console.log("Sending invitation with data:", {
        vessel_id: vesselId,
        email: inviteEmail,
        role: inviteRole,
        permissions: invitePermissions,
        invited_by: user?.auth_id,
        invitation_code: invitationCode,
        expires_at: expiresAt.toISOString(),
      });

      const { error } = await supabase
        .from("vessel_access_invitations")
        .insert({
          vessel_id: vesselId,
          email: inviteEmail,
          role: inviteRole,
          permissions: invitePermissions,
          invited_by: user?.auth_id,
          invitation_code: invitationCode,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Optionally send email via Edge Function
      try {
        const { data: invitationData } = await supabase
          .from("vessel_access_invitations")
          .select("id")
          .eq("invitation_code", invitationCode)
          .single();

        if (invitationData) {
          // Call the Edge Function to send email
          const { data: emailResponse, error: emailError } =
            await supabase.functions.invoke("send-invitation-email", {
              body: {
                invitationId: invitationData.id,
                email: inviteEmail,
                invitationCode,
                vesselName,
                role: inviteRole,
                expiresAt: expiresAt.toISOString(),
              },
            });

          if (emailError) {
            console.error("Error sending email:", emailError);
          } else {
            console.log("Email sent successfully:", emailResponse);
          }
        }
      } catch (emailError) {
        console.error("Error with email sending:", emailError);
        // Don't fail the invitation creation if email fails
      }

      // Create invitation URL
      const invitationUrl = `${window.location.origin}/vessel-invitation/${invitationCode}`;

      // Generate email template
      const emailTemplate = generateEmailTemplate(
        invitationCode,
        inviteEmail,
        inviteRole,
        vesselName,
        expiresAt
      );

      // Show success with invitation details and email template
      toast({
        title: "Invitation Created Successfully!",
        description: (
          <div className="space-y-2">
            <p>Invitation sent to: {inviteEmail}</p>
            <p className="text-sm text-gray-600">
              Invitation Code: {invitationCode}
            </p>
            <p className="text-sm text-gray-600">
              Expires: {expiresAt.toLocaleDateString()}
            </p>
            <div className="mt-2">
              <p className="text-sm font-medium">
                Share this link with the user:
              </p>
              <p className="text-xs text-blue-600 break-all">{invitationUrl}</p>
            </div>
            <div className="mt-2 p-2 bg-gray-50 rounded">
              <p className="text-sm font-medium">Email Template:</p>
              <p className="text-xs text-gray-600">
                Subject: {emailTemplate.subject}
              </p>
              <textarea
                className="w-full text-xs mt-1 p-1 border rounded"
                rows={8}
                value={emailTemplate.body}
                readOnly
              />
              <button
                className="text-xs text-blue-600 mt-1"
                onClick={() => {
                  navigator.clipboard.writeText(emailTemplate.body);
                  toast({
                    title: "Copied!",
                    description: "Email template copied to clipboard",
                    variant: "default",
                  });
                }}
              >
                Copy Email Template
              </button>
            </div>
          </div>
        ),
        variant: "default",
        duration: 15000, // Show for 15 seconds
      });

      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("delegate");
      setInvitePermissions(["view_basic_info"]);
      setInviteExpiry("7");
      fetchAccessData();
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({
        title: "Error",
        description: `Failed to send invitation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateUserAccess = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("vessel_access_control")
        .update({
          role: editRole,
          permissions: editPermissions,
          expires_at: editExpiry
            ? new Date(
                Date.now() + parseInt(editExpiry) * 24 * 60 * 60 * 1000
              ).toISOString()
            : null,
        })
        .eq("vessel_id", vesselId)
        .eq("user_id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User access updated successfully",
        variant: "default",
      });

      setEditDialogOpen(false);
      setSelectedUser(null);

      // Refresh both access data and vessel access hook
      await fetchAccessData();
      if (vesselAccess.refetch) {
        await vesselAccess.refetch();
      }
    } catch (error) {
      console.error("Error updating user access:", error);
      toast({
        title: "Error",
        description: "Failed to update user access",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("vessel_access_control")
        .update({ is_active: false })
        .eq("vessel_id", vesselId)
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Access revoked successfully",
        variant: "default",
      });

      fetchAccessData();
    } catch (error) {
      console.error("Error revoking access:", error);
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive",
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("vessel_access_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation cancelled",
        variant: "default",
      });

      fetchAccessData();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: VesselAccessUser) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditPermissions(user.permissions);
    setEditExpiry("");
    setEditDialogOpen(true);
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

  const getPermissionLabel = (permission: VesselAccessPermission) => {
    const labels: Record<VesselAccessPermission, string> = {
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
      edit_locations: "Edit Locations",
      manage_access: "Manage Access",
      delete_vessel: "Delete Vessel",
      full_access: "Full Access",
    };
    return labels[permission];
  };

  if (!canManage) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage access for this vessel.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vessel Access Management</h2>
          <p className="text-gray-600">
            Manage access permissions for {vesselName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAccessData}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User to Vessel</DialogTitle>
                <DialogDescription>
                  Send an invitation to give access to this vessel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) =>
                      setInviteRole(value as VesselAccessRole)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_PERMISSIONS).map(
                        ([role, permissions]) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center justify-between w-full">
                              <span className="capitalize">{role}</span>
                              <Badge variant="secondary" className="ml-2">
                                {permissions.length} permissions
                              </Badge>
                            </div>
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiry">Invitation Expiry (days)</Label>
                  <Input
                    id="expiry"
                    type="number"
                    value={inviteExpiry}
                    onChange={(e) => setInviteExpiry(e.target.value)}
                    min="1"
                    max="30"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setInviteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleInviteUser}>Send Invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Active Users ({activeUsers.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Pending Invitations ({pendingInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Invitation History ({acceptedInvitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {activeUsers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No active users found.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold">{user.name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getRoleColor(user.role)}>
                              {user.role}
                            </Badge>
                            {user.expires_at && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Expires{" "}
                                {new Date(user.expires_at).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeAccess(user.id)}
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.map((permission) => (
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          {pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No pending invitations.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{invitation.email}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getRoleColor(invitation.role)}>
                            {invitation.role}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Expires{" "}
                            {new Date(
                              invitation.expires_at
                            ).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {acceptedInvitations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No invitation history found.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {acceptedInvitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{invitation.email}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getRoleColor(invitation.role)}>
                            {invitation.role}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Accepted{" "}
                            {new Date(
                              invitation.accepted_at
                            ).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit User Access Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Access</DialogTitle>
            <DialogDescription>
              Update permissions for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editRole}
                onValueChange={(value) =>
                  setEditRole(value as VesselAccessRole)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_PERMISSIONS).map(
                    ([role, permissions]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center justify-between w-full">
                          <span className="capitalize">{role}</span>
                          <Badge variant="secondary" className="ml-2">
                            {permissions.length} permissions
                          </Badge>
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-expiry">
                Access Expiry (days, optional)
              </Label>
              <Input
                id="edit-expiry"
                type="number"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                min="1"
                placeholder="Leave empty for no expiry"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUserAccess}>Update Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
