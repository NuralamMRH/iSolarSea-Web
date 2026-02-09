import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import gsap from "gsap";
import { Eye, EyeOff } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

const passwordSchema = z
  .object({
    otp: z
      .string()
      .min(4, { message: "Please enter the OTP sent to your email." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const ForgetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animation refs
  const heroRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (heroRef.current) {
      gsap.from(heroRef.current, {
        opacity: 0,
        y: 60,
        duration: 1,
        ease: "power2.out",
      });
    }
  }, []);

  // Step 1: Request OTP
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  // Step 2: Enter OTP and new password
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { otp: "", password: "", confirmPassword: "" },
  });

  const handleSendOtp = async (values: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    try {
      // Send OTP to email
      const { error } = await supabase.auth.resetPasswordForEmail(values.email);
      if (error) throw error;
      setEmail(values.email);
      setStep(2);
      toast({
        title: "OTP sent",
        description: "Please check your email for the OTP.",
      });
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Failed to send OTP",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (
    values: z.infer<typeof passwordSchema>
  ) => {
    setIsLoading(true);
    try {
      // First, verify OTP
      const { error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: values.otp,
        type: "email",
      });
      if (otpError) throw otpError;
      // Then, update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (updateError) throw updateError;
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      });
      navigate("/login");
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Password reset failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="wrapper" className="flex flex-col min-h-screen">
      <Header />
      <main className="main font-[13px]">
        <div className="login">
          <div className="container">
            <div ref={heroRef} className="hero">
              <div className="login__box">
                <h2 className="c-title-1">
                  <span className="c-title-1__gradient c-title-1__gradient--white">
                    Forgot Password
                  </span>
                </h2>
                <div className="c-border c-border--white"></div>
                <div className="login__form">
                  {step === 1 && (
                    <Form {...emailForm}>
                      <form
                        onSubmit={emailForm.handleSubmit(handleSendOtp)}
                        className="space-y-6"
                      >
                        <FormField
                          control={emailForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[14px]">
                                {t("auth.email")}
                              </FormLabel>
                              <FormControl>
                                <input
                                  placeholder={t("auth.email_placeholder")}
                                  className="text-[14px] min-h-7"
                                  {...field}
                                  onChange={(e) => {
                                    const lowercaseValue =
                                      e.target.value.toLowerCase();
                                    field.onChange(lowercaseValue);
                                    e.target.value = lowercaseValue;
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="login__form-btn c-btn-1 c-btn-1--center">
                          <button
                            type="submit"
                            className="c-btn-1__button"
                            disabled={isLoading}
                          >
                            {isLoading ? "Sending OTP..." : "Send OTP"}
                          </button>
                        </div>
                      </form>
                    </Form>
                  )}
                  {step === 2 && (
                    <Form {...passwordForm}>
                      <form
                        onSubmit={passwordForm.handleSubmit(
                          handleResetPassword
                        )}
                        className="space-y-6"
                      >
                        <FormField
                          control={passwordForm.control}
                          name="otp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[14px]">
                                {t("auth.otp")}
                              </FormLabel>
                              <FormControl>
                                <input
                                  placeholder={t("auth.otp_placeholder")}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[14px]">
                                {t("auth.password")}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder={t("auth.password_placeholder")}
                                    className="text-[14px] min-h-7 pr-10 w-full"
                                    {...field}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
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
                              <FormLabel className="text-[14px]">
                                {t("auth.confirm_password")}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <input
                                    type={
                                      showConfirmPassword ? "text" : "password"
                                    }
                                    placeholder={t("auth.password_placeholder")}
                                    className="text-[14px] min-h-7 pr-10 w-full"
                                    {...field}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowConfirmPassword(
                                        !showConfirmPassword
                                      )
                                    }
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="login__form-btn c-btn-1 c-btn-1--center">
                          <button
                            type="submit"
                            className="c-btn-1__button"
                            disabled={isLoading}
                          >
                            {isLoading
                              ? "Resetting password..."
                              : "Reset Password"}
                          </button>
                        </div>
                      </form>
                    </Form>
                  )}
                </div>
                <div className="c-border c-border--white"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgetPassword;
