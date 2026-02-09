import React, { useState } from "react";
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
  Lock,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
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

// Form validation schemas
const emailChangeSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type EmailChangeFormData = z.infer<typeof emailChangeSchema>;
type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

const Security = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isEmailChanging, setIsEmailChanging] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentAuthEmail, setCurrentAuthEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const emailForm = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Fetch current auth user details
  React.useEffect(() => {
    const fetchAuthUser = async () => {
      if (!user?.auth_id) return;

      setIsLoading(true);
      try {
        // Get current auth user details
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Error fetching auth user:", error);
          toast({
            title: "Error",
            description: "Failed to load user details",
            variant: "destructive",
          });
          return;
        }

        if (authUser) {
          setCurrentAuthEmail(authUser.email || "");
          // Update the email form with current auth email
          emailForm.reset({
            email: authUser.email || "",
            password: "",
          });
        }
      } catch (error) {
        console.error("Error fetching auth user:", error);
        toast({
          title: "Error",
          description: "Failed to load user details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthUser();
  }, [user?.auth_id, emailForm, toast]);

  const handleEmailChange = async (data: EmailChangeFormData) => {
    if (!user?.auth_id) return;

    setIsEmailChanging(true);
    try {
      // First, verify the current password using the current auth email
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentAuthEmail,
        password: data.password,
      });

      if (signInError) {
        toast({
          title: "Authentication Error",
          description: "Current password is incorrect",
          variant: "destructive",
        });
        return;
      }

      // Check if the new email already exists in our users table
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("auth_id")
        .eq("email", data.email)
        .neq("auth_id", user.auth_id)
        .single();

      if (existingUser) {
        toast({
          title: "Email Already Exists",
          description:
            "This email address is already registered by another user",
          variant: "destructive",
        });
        return;
      }

      // Try to update email using custom function first (if available)
      let emailUpdated = false;
      try {
        const { data: functionResult, error: functionError } =
          await supabase.rpc("update_user_email_without_confirmation", {
            user_auth_id: user.auth_id,
            new_email: data.email,
          });

        if (!functionError && functionResult) {
          emailUpdated = true;
          console.log("Email updated using custom function");
        }
      } catch (functionError) {
        console.log("Custom function not available, using standard method");
      }

      // If custom function didn't work, use standard method
      if (!emailUpdated) {
        const { data: updateData, error: updateError } =
          await supabase.auth.updateUser({
            email: data.email,
          });

        if (updateError) {
          console.error("Error updating email:", updateError);
          toast({
            title: "Error",
            description: updateError.message || "Failed to update email",
            variant: "destructive",
          });
          return;
        }

        // Check if email confirmation is required
        if (updateData.user && !updateData.user.email_confirmed_at) {
          // Email change requires confirmation
          toast({
            title: "Email Update Pending",
            description:
              "Please check your new email address and click the confirmation link to complete the email change.",
            variant: "default",
          });

          // Update the users table with the new email (pending confirmation)
          const { error: dbError } = await supabase
            .from("users")
            .update({
              email: data.email,
              updated_at: new Date().toISOString(),
            })
            .eq("auth_id", user.auth_id);

          if (dbError) {
            console.error("Error updating users table:", dbError);
          }

          // Reset the form
          emailForm.reset({
            email: data.email,
            password: "",
          });

          return;
        }
      }

      // Email was updated successfully (either by custom function or without confirmation required)
      // Update the users table as well (if not already updated by custom function)
      if (!emailUpdated) {
        const { error: dbError } = await supabase
          .from("users")
          .update({
            email: data.email,
            updated_at: new Date().toISOString(),
          })
          .eq("auth_id", user.auth_id);

        if (dbError) {
          console.error("Error updating users table:", dbError);
          toast({
            title: "Warning",
            description: "Email updated in auth but failed to update database",
            variant: "destructive",
          });
          return;
        }
      }

      // Update local state
      setCurrentAuthEmail(data.email);

      toast({
        title: "Email Updated",
        description: "Your email address has been updated successfully.",
        variant: "default",
      });

      // Reset the form
      emailForm.reset({
        email: data.email,
        password: "",
      });
    } catch (error) {
      console.error("Error changing email:", error);
      toast({
        title: "Error",
        description: "Failed to change email",
        variant: "destructive",
      });
    } finally {
      setIsEmailChanging(false);
    }
  };

  const handlePasswordChange = async (data: PasswordChangeFormData) => {
    if (!user?.auth_id) return;

    setIsPasswordChanging(true);
    try {
      // First, verify the current password using the current auth email
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentAuthEmail,
        password: data.currentPassword,
      });

      if (signInError) {
        toast({
          title: "Authentication Error",
          description: "Current password is incorrect",
          variant: "destructive",
        });
        return;
      }

      // Update the password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) {
        console.error("Error updating password:", updateError);
        toast({
          title: "Error",
          description: updateError.message || "Failed to update password",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
        variant: "default",
      });

      // Reset the form
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsPasswordChanging(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Security Settings" />

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading security settings...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Email Change Section */}
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="flex items-center space-x-2 mb-6">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Change Email Address</h2>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Email Change:</p>
                    <p>
                      Enter your new email address and current password to
                      update your email. The email will be changed immediately
                      without verification.
                    </p>
                  </div>
                </div>
              </div>

              <Form {...emailForm}>
                <form
                  onSubmit={emailForm.handleSubmit(handleEmailChange)}
                  className="space-y-4"
                >
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter new email address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="password"
                              placeholder="Enter current password"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isEmailChanging}
                    className="w-full"
                  >
                    {isEmailChanging ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Email...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Update Email
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Password Change Section */}
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="flex items-center space-x-2 mb-6">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Change Password</h2>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Password Change:</p>
                    <p>
                      Enter your current password and new password to update
                      your password. The password will be changed immediately
                      without email verification.
                    </p>
                  </div>
                </div>
              </div>

              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Enter current password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                              }
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter new password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm new password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isPasswordChanging}
                    className="w-full"
                  >
                    {isPasswordChanging ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Security;
