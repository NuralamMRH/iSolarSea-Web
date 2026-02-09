import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Shield,
  Ship,
  Fish,
  AlertTriangle,
  Settings,
  Save,
  Loader2,
  CheckCircle,
  Info,
} from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Form validation schema
const notificationSchema = z.object({
  // Email notifications
  email_notifications_enabled: z.boolean(),
  email_fishing_logs: z.boolean(),
  email_vessel_updates: z.boolean(),
  email_system_alerts: z.boolean(),
  email_market_updates: z.boolean(),
  email_security_alerts: z.boolean(),
  email_approval_requests: z.boolean(),
  email_daily_reports: z.boolean(),
  email_weekly_reports: z.boolean(),

  // SMS notifications
  sms_notifications_enabled: z.boolean(),
  sms_fishing_logs: z.boolean(),
  sms_vessel_updates: z.boolean(),
  sms_system_alerts: z.boolean(),
  sms_security_alerts: z.boolean(),

  // Push notifications
  push_notifications_enabled: z.boolean(),
  push_fishing_logs: z.boolean(),
  push_vessel_updates: z.boolean(),
  push_system_alerts: z.boolean(),
  push_security_alerts: z.boolean(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface NotificationSettings {
  id: string;
  auth_id: string;
  email_notifications_enabled: boolean;
  email_fishing_logs: boolean;
  email_vessel_updates: boolean;
  email_system_alerts: boolean;
  email_market_updates: boolean;
  email_security_alerts: boolean;
  email_approval_requests: boolean;
  email_daily_reports: boolean;
  email_weekly_reports: boolean;
  sms_notifications_enabled: boolean;
  sms_fishing_logs: boolean;
  sms_vessel_updates: boolean;
  sms_system_alerts: boolean;
  sms_security_alerts: boolean;
  push_notifications_enabled: boolean;
  push_fishing_logs: boolean;
  push_vessel_updates: boolean;
  push_system_alerts: boolean;
  push_security_alerts: boolean;
  can_receive_admin_notifications: boolean;
  can_receive_captain_notifications: boolean;
  can_receive_owner_notifications: boolean;
  can_receive_fleet_notifications: boolean;
  can_receive_processing_notifications: boolean;
}

const Notifications = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      email_notifications_enabled: true,
      email_fishing_logs: true,
      email_vessel_updates: true,
      email_system_alerts: true,
      email_market_updates: true,
      email_security_alerts: true,
      email_approval_requests: true,
      email_daily_reports: true,
      email_weekly_reports: true,
      sms_notifications_enabled: false,
      sms_fishing_logs: false,
      sms_vessel_updates: false,
      sms_system_alerts: true,
      sms_security_alerts: true,
      push_notifications_enabled: false,
      push_fishing_logs: false,
      push_vessel_updates: false,
      push_system_alerts: true,
      push_security_alerts: true,
    },
  });

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      if (!user?.auth_id) return;

      setIsLoading(true);
      try {
        // Get user role first
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("auth_id", user.auth_id)
          .single();

        if (userError) {
          console.error("Error fetching user role:", userError);
        } else {
          setUserRole(userData.role);
        }

        // Get notification settings
        const { data: settings, error: settingsError } = await supabase
          .from("notification_settings")
          .select("*")
          .eq("auth_id", user.auth_id)
          .single();

        if (settingsError && settingsError.code !== "PGRST116") {
          // PGRST116 = no rows returned
          console.error("Error fetching notification settings:", settingsError);
        }

        if (settings) {
          setNotificationSettings(settings);
          form.reset({
            email_notifications_enabled: settings.email_notifications_enabled,
            email_fishing_logs: settings.email_fishing_logs,
            email_vessel_updates: settings.email_vessel_updates,
            email_system_alerts: settings.email_system_alerts,
            email_market_updates: settings.email_market_updates,
            email_security_alerts: settings.email_security_alerts,
            email_approval_requests: settings.email_approval_requests,
            email_daily_reports: settings.email_daily_reports,
            email_weekly_reports: settings.email_weekly_reports,
            sms_notifications_enabled: settings.sms_notifications_enabled,
            sms_fishing_logs: settings.sms_fishing_logs,
            sms_vessel_updates: settings.sms_vessel_updates,
            sms_system_alerts: settings.sms_system_alerts,
            sms_security_alerts: settings.sms_security_alerts,
            push_notifications_enabled: settings.push_notifications_enabled,
            push_fishing_logs: settings.push_fishing_logs,
            push_vessel_updates: settings.push_vessel_updates,
            push_system_alerts: settings.push_system_alerts,
            push_security_alerts: settings.push_security_alerts,
          });
        } else {
          // Initialize notification settings if none exist
          try {
            // First, check if the table exists by trying a simple select
            const { error: tableCheckError } = await supabase
              .from("notification_settings")
              .select("auth_id")
              .limit(1);

            if (tableCheckError) {
              console.error("Table check error:", tableCheckError);
              toast({
                title: "Setup Required",
                description:
                  "Notification settings table is not set up yet. Please contact an administrator.",
                variant: "destructive",
              });
              return;
            }

            // Try to use the initialization function
            const { data: initResult, error: initError } = await supabase.rpc(
              "initialize_user_notification_settings",
              {
                user_auth_id: user.auth_id,
              }
            );

            if (initError) {
              console.error(
                "Error initializing notification settings:",
                initError
              );

              // If the function doesn't exist, create default settings manually
              if (
                initError.message?.includes("function") ||
                initError.message?.includes("does not exist") ||
                initError.message?.includes("not found")
              ) {
                console.log(
                  "Function not found, creating default settings manually"
                );

                const { data: insertResult, error: insertError } =
                  await supabase
                    .from("notification_settings")
                    .insert({
                      auth_id: user.auth_id,
                      email_notifications_enabled: true,
                      email_fishing_logs: true,
                      email_vessel_updates: true,
                      email_system_alerts: true,
                      email_market_updates: true,
                      email_security_alerts: true,
                      email_approval_requests: true,
                      email_daily_reports: true,
                      email_weekly_reports: true,
                      sms_notifications_enabled: false,
                      sms_fishing_logs: false,
                      sms_vessel_updates: false,
                      sms_system_alerts: true,
                      sms_security_alerts: true,
                      push_notifications_enabled: false,
                      push_fishing_logs: false,
                      push_vessel_updates: false,
                      push_system_alerts: true,
                      push_security_alerts: true,
                      can_receive_admin_notifications:
                        userRole === "admin" || userRole === "super_admin",
                      can_receive_captain_notifications:
                        userRole === "Captain" ||
                        userRole === "admin" ||
                        userRole === "super_admin",
                      can_receive_owner_notifications:
                        userRole === "Owner" ||
                        userRole === "ship_owner" ||
                        userRole === "admin" ||
                        userRole === "super_admin",
                      can_receive_fleet_notifications:
                        userRole === "fleet_management" ||
                        userRole === "admin" ||
                        userRole === "super_admin",
                      can_receive_processing_notifications:
                        userRole === "nm_processing" ||
                        userRole === "admin" ||
                        userRole === "super_admin",
                    })
                    .select()
                    .single();

                if (insertError) {
                  console.error(
                    "Error creating default settings:",
                    insertError
                  );

                  // Check if it's a policy issue
                  if (
                    insertError.message?.includes("policy") ||
                    insertError.message?.includes("permission")
                  ) {
                    toast({
                      title: "Permission Error",
                      description:
                        "You don't have permission to create notification settings. Please contact an administrator.",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Error",
                      description: `Failed to create notification settings: ${insertError.message}`,
                      variant: "destructive",
                    });
                  }
                } else if (insertResult) {
                  setNotificationSettings(insertResult);
                  form.reset({
                    email_notifications_enabled:
                      insertResult.email_notifications_enabled,
                    email_fishing_logs: insertResult.email_fishing_logs,
                    email_vessel_updates: insertResult.email_vessel_updates,
                    email_system_alerts: insertResult.email_system_alerts,
                    email_market_updates: insertResult.email_market_updates,
                    email_security_alerts: insertResult.email_security_alerts,
                    email_approval_requests:
                      insertResult.email_approval_requests,
                    email_daily_reports: insertResult.email_daily_reports,
                    email_weekly_reports: insertResult.email_weekly_reports,
                    sms_notifications_enabled:
                      insertResult.sms_notifications_enabled,
                    sms_fishing_logs: insertResult.sms_fishing_logs,
                    sms_vessel_updates: insertResult.sms_vessel_updates,
                    sms_system_alerts: insertResult.sms_system_alerts,
                    sms_security_alerts: insertResult.sms_security_alerts,
                    push_notifications_enabled:
                      insertResult.push_notifications_enabled,
                    push_fishing_logs: insertResult.push_fishing_logs,
                    push_vessel_updates: insertResult.push_vessel_updates,
                    push_system_alerts: insertResult.push_system_alerts,
                    push_security_alerts: insertResult.push_security_alerts,
                  });

                  toast({
                    title: "Settings Created",
                    description:
                      "Default notification settings have been created for you.",
                    variant: "default",
                  });
                }
              } else {
                toast({
                  title: "Error",
                  description: `Failed to initialize notification settings: ${initError.message}`,
                  variant: "destructive",
                });
              }
            } else {
              // Fetch the initialized settings
              const { data: newSettings } = await supabase
                .from("notification_settings")
                .select("*")
                .eq("auth_id", user.auth_id)
                .single();

              if (newSettings) {
                setNotificationSettings(newSettings);
                form.reset({
                  email_notifications_enabled:
                    newSettings.email_notifications_enabled,
                  email_fishing_logs: newSettings.email_fishing_logs,
                  email_vessel_updates: newSettings.email_vessel_updates,
                  email_system_alerts: newSettings.email_system_alerts,
                  email_market_updates: newSettings.email_market_updates,
                  email_security_alerts: newSettings.email_security_alerts,
                  email_approval_requests: newSettings.email_approval_requests,
                  email_daily_reports: newSettings.email_daily_reports,
                  email_weekly_reports: newSettings.email_weekly_reports,
                  sms_notifications_enabled:
                    newSettings.sms_notifications_enabled,
                  sms_fishing_logs: newSettings.sms_fishing_logs,
                  sms_vessel_updates: newSettings.sms_vessel_updates,
                  sms_system_alerts: newSettings.sms_system_alerts,
                  sms_security_alerts: newSettings.sms_security_alerts,
                  push_notifications_enabled:
                    newSettings.push_notifications_enabled,
                  push_fishing_logs: newSettings.push_fishing_logs,
                  push_vessel_updates: newSettings.push_vessel_updates,
                  push_system_alerts: newSettings.push_system_alerts,
                  push_security_alerts: newSettings.push_security_alerts,
                });
              }
            }
          } catch (functionError) {
            console.error("Error with initialization function:", functionError);
            toast({
              title: "Error",
              description: "Failed to initialize notification settings",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching notification settings:", error);
        toast({
          title: "Error",
          description: "Failed to load notification settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotificationSettings();
  }, [user?.auth_id, form, toast]);

  const onSubmit = async (data: NotificationFormData) => {
    if (!user?.auth_id) return;

    setIsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("notification_settings")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_id", user.auth_id);

      if (updateError) {
        console.error("Error updating notification settings:", updateError);
        toast({
          title: "Error",
          description: "Failed to save notification settings",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Settings Saved",
        description:
          "Your notification preferences have been updated successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      super_admin: "Super Admin",
      admin: "Admin",
      Captain: "Captain",
      Owner: "Owner",
      ship_owner: "Ship Owner",
      fleet_management: "Fleet Management",
      nm_processing: "NM Processing",
      manager: "Manager",
      crew_manager: "Crew Manager",
      Crew: "Crew",
      VVIP: "VVIP",
      VIP: "VIP",
      VP: "VP",
    };
    return roleMap[role] || role;
  };

  const getRoleBasedPermissions = () => {
    if (!notificationSettings) return [];

    const permissions = [];

    if (notificationSettings.can_receive_admin_notifications) {
      permissions.push("Admin Notifications");
    }
    if (notificationSettings.can_receive_captain_notifications) {
      permissions.push("Captain Notifications");
    }
    if (notificationSettings.can_receive_owner_notifications) {
      permissions.push("Owner Notifications");
    }
    if (notificationSettings.can_receive_fleet_notifications) {
      permissions.push("Fleet Management Notifications");
    }
    if (notificationSettings.can_receive_processing_notifications) {
      permissions.push("Processing Notifications");
    }

    return permissions;
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader title="Notification Settings" />
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading notification settings...</span>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Notification Settings" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Email Notifications */}
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <div className="flex items-center space-x-2 mb-6">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Email Notifications</h2>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email_notifications_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Email Notifications
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("email_notifications_enabled") && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <FormField
                      control={form.control}
                      name="email_fishing_logs"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Fishing Logs
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Updates about fishing activities
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_vessel_updates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Vessel Updates
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Changes to vessel information
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_system_alerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              System Alerts
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Important system notifications
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_security_alerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Security Alerts
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Security-related notifications
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_market_updates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Market Updates
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Market and pricing information
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_approval_requests"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Approval Requests
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Requests requiring your approval
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_daily_reports"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Daily Reports
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Daily summary reports
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email_weekly_reports"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Weekly Reports
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Weekly summary reports
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </form>
            </Form>
          </div>

          {/* SMS Notifications */}
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <div className="flex items-center space-x-2 mb-6">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">SMS Notifications</h2>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="sms_notifications_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable SMS Notifications
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Receive notifications via SMS
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("sms_notifications_enabled") && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <FormField
                      control={form.control}
                      name="sms_fishing_logs"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Fishing Logs
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Critical fishing updates
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sms_vessel_updates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Vessel Updates
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Important vessel changes
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sms_system_alerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              System Alerts
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Critical system notifications
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sms_security_alerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Security Alerts
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Security notifications
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </form>
            </Form>
          </div>

          {/* Push Notifications */}
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <div className="flex items-center space-x-2 mb-6">
              <Smartphone className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Push Notifications</h2>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="push_notifications_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Push Notifications
                        </FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Receive notifications on your device
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("push_notifications_enabled") && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <FormField
                      control={form.control}
                      name="push_fishing_logs"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Fishing Logs
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Fishing activity updates
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="push_vessel_updates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Vessel Updates
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Vessel information changes
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="push_system_alerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              System Alerts
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              System notifications
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="push_security_alerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Security Alerts
                            </FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Security notifications
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </form>
            </Form>
          </div>

          {/* Role-based Permissions */}
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <div className="flex items-center space-x-2 mb-6">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Role-based Permissions</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">
                      Your Role: {getRoleDisplayName(userRole)}
                    </p>
                    <p className="mt-1">
                      Based on your role, you can receive the following types of
                      notifications:
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {getRoleBasedPermissions().map((permission, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded"
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{permission}</span>
                  </div>
                ))}
              </div>

              {getRoleBasedPermissions().length === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Limited Permissions</p>
                      <p>
                        Your current role has limited notification permissions.
                        Contact an administrator for more access.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="p-6">
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSaving}
            className="w-full lg:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Notification Settings
              </>
            )}
          </Button>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Notifications;
