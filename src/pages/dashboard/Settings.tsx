import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Globe,
  Lock,
  User as UserIcon,
  Settings as SettingsIcon,
  BaggageClaim,
  Save,
  Loader2,
} from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { useAuthStore, type User } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { Database } from "@/integrations/supabase/types";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Form validation schema
const settingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const Settings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, updateUser } = useAuthStore();
  const [userData, setUserData] = useState<
    Database["public"]["Tables"]["users"]["Row"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (!user?.auth_id) return;

      setIsLoading(true);
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.auth_id)
          .single();

        if (userError) {
          console.error("Error fetching user data:", userError);
          toast({
            title: "Error",
            description: "Failed to load user data",
            variant: "destructive",
          });
          return;
        }

        setUserData(userData);

        // Update form with user data
        form.reset({
          name: userData?.name || "",
          email: userData?.email || "",
          phone: userData?.phone || "",
        });

        console.log("Initial user data loaded:", {
          userData,
          formValues: {
            name: userData?.name || "",
            email: userData?.email || "",
            phone: userData?.phone || "",
          },
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [user, form, toast]);

  const onSubmit = async (data: SettingsFormData) => {
    if (!user?.auth_id) return;

    setIsSaving(true);
    try {
      // Check if email or phone has changed
      const emailChanged = data.email !== userData?.email;
      const phoneChanged = data.phone !== userData?.phone;

      // Note: Email and phone changes in Supabase Auth should be handled in the Security page
      // This page only updates the users table for display purposes
      if (emailChanged) {
        toast({
          title: "Email Change Notice",
          description:
            "To change your email address, please use the Security Settings page.",
          variant: "default",
        });
        return;
      }

      // Update users table
      const { data: updateData, error: updateError } = await supabase
        .from("users")
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_id", user.auth_id)
        .select();

      console.log("Update attempt result:", {
        updateData,
        updateError,
        userAuthId: user.auth_id,
        formData: {
          name: data.name,
          email: data.email,
          phone: data.phone,
        },
      });

      if (updateError) {
        console.error("Error saving user data:", updateError);
        toast({
          title: "Error",
          description: `Failed to save changes: ${updateError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Update local state with new data
      const updatedUserData = { ...userData, ...data };
      setUserData(updatedUserData);

      // Reset form with new data to clear dirty state
      form.reset({
        name: data.name,
        email: data.email,
        phone: data.phone,
      });

      // Update auth store with any changed fields
      const authUpdates: Partial<User> = {};
      if (data.name !== userData?.name) {
        authUpdates.name = data.name;
      }
      if (Object.keys(authUpdates).length > 0) {
        updateUser(authUpdates);
      }

      // Refetch user data to confirm the update was successful
      const { data: refetchedData, error: refetchError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.auth_id)
        .single();

      if (refetchError) {
        console.warn(
          "Warning: Could not refetch user data after update:",
          refetchError
        );
      } else {
        console.log("Refetched user data confirms update:", refetchedData);
      }

      console.log("User data updated successfully:", {
        oldData: userData,
        newData: data,
        updatedUserData,
        refetchedData,
      });

      toast({
        title: t("auth.user_data_saved_successfully"),
        description: t("auth.user_data_saved_successfully_description"),
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving user data:", error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader title="Account Settings" />
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading settings...</span>
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
        <SiteHeader title="Account Settings" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="flex items-center space-x-2 mb-6">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  {t("auth.account_settings")}
                </h2>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
                      <UserIcon className="h-4 w-4" />
                      <span>{t("auth.personal_information")}</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.full_name")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("auth.full_name_placeholder")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.email")}</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder={t("auth.email_placeholder")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("auth.phone")}</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={t("auth.phone_placeholder")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem>
                        <FormLabel>{t("auth.role")}</FormLabel>
                        <Input
                          value={
                            userData?.role?.toUpperCase().replace("_", " ") ||
                            ""
                          }
                          className="bg-muted cursor-not-allowed"
                          disabled
                        />
                      </FormItem>

                      <FormItem>
                        <FormLabel>{t("auth.account_type")}</FormLabel>
                        <Input
                          value={userData?.account_type || ""}
                          className="bg-muted cursor-not-allowed"
                          disabled
                        />
                      </FormItem>

                      <FormItem>
                        <FormLabel>{t("auth.account_package")}</FormLabel>
                        <Input
                          value={userData?.account_package || ""}
                          className="bg-muted cursor-not-allowed"
                          disabled
                        />
                      </FormItem>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      type="submit"
                      disabled={isSaving || !form.formState.isDirty}
                      className="min-w-[120px]"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t("auth.save_changes")}
                        </>
                      )}
                    </Button>

                    {form.formState.isDirty && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        <p>Changes detected:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {form.watch("name") !== userData?.name && (
                            <li>Name will be updated</li>
                          )}
                          {form.watch("email") !== userData?.email && (
                            <li>
                              Email change detected - please use Security
                              Settings page
                            </li>
                          )}
                          {form.watch("phone") !== userData?.phone && (
                            <li>Phone number will be updated (display only)</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </form>
              </Form>
            </div>
          </div>

          {/* Sidebar with additional settings */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage your notification preferences
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="/settings/notifications">Configure Notifications</a>
              </Button>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>Security</span>
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Update your password and security settings
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href="/settings/security">Security Settings</a>
              </Button>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>Language</span>
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Change your preferred language
              </p>
              <Button variant="outline" className="w-full">
                Language Settings
              </Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Settings;
