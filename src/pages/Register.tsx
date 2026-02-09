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
import { Link, useNavigate } from "react-router-dom";
import { signUp, supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import gsap from "gsap";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { useOtpEnabled } from "@/hooks/use-otp-enabled";
import { useAuthStore } from "@/stores/auth-store";
import { Eye, EyeOff } from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  // const otpEnabled = useOtpEnabled();
  const otpEnabled = false;
  const [showOtpField, setShowOtpField] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  const heroRef = useRef<HTMLDivElement | null>(null);
  const box1Ref = useRef<HTMLDivElement | null>(null);
  const box2Ref = useRef<HTMLDivElement | null>(null);
  const areaRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Add password match check function
  const checkPasswordMatch = (password: string, confirmPassword: string) => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordMatch(false);
    } else {
      setPasswordMatch(true);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (heroRef.current) {
      gsap.from(heroRef.current, {
        opacity: 0,
        y: 60,
        duration: 1,
        ease: "power2.out",
      });
    }
    if (box1Ref.current) {
      gsap.from(box1Ref.current, {
        opacity: 0,
        y: 50,
        duration: 1,
        delay: 0.2,
        ease: "power2.out",
      });
    }
    if (box2Ref.current) {
      gsap.from(box2Ref.current, {
        opacity: 0,
        y: 50,
        duration: 1,
        delay: 0.4,
        ease: "power2.out",
      });
    }
    if (areaRefs.current) {
      areaRefs.current.forEach((el, i) => {
        if (el) {
          gsap.from(el, {
            opacity: 0,
            y: 40,
            duration: 0.8,
            delay: 0.6 + i * 0.2,
            ease: "power2.out",
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (showOtpField) {
      setTimer(60);
      setCanResend(false);
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showOtpField]);

  const formSchema = z
    .object({
      name: z.string().min(2, {
        message: t("auth.name_validation"),
      }),
      email: z.string().email({
        message: t("auth.email_validation"),
      }),
      phone: z.string().min(10, {
        message: t("auth.phone_validation"),
      }),
      password: z.string().min(6, {
        message: t("auth.password_validation"),
      }),
      confirmPassword: z.string().min(6, {
        message: t("auth.password_validation"),
      }),
      account_type: z.enum(["Ship Owner", "Fleet Management", "NM Processing"]),
      account_package: z.enum(["Gold", "Premium", "Basic"]),
      otp: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.password_match_validation"),
      path: ["confirmPassword"],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      account_type: "Fleet Management",
      account_package: "Gold",
      otp: "",
    },
  });

  const verificationType: "email" | "phone" = "email";

  if (otpEnabled === null) return <div>Loading...</div>; // or spinner

  console.log("otpEnabled ", otpEnabled);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      console.log("values", values);

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            account_type: values.account_type,
            account_package: values.account_package,
          },
        },
      });

      if (error) throw error;

      // Insert into users table if user is present
      const user = data.user;
      if (user) {
        const { data: insertData, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              auth_id: user.id,
              email: user.email, // use the email from Auth, not just the form
              name: values.name,
              phone: values.phone,
              account_type: values.account_type,
              account_package: values.account_package,
              role: values.account_type.toLowerCase().replace(" ", "_"), // Keep default role for backward compatibility
              is_approved: true,
            },
          ]);

        if (insertError) {
          console.error("Error inserting user data:", insertError);
          throw insertError;
        }

        console.log("User data inserted successfully:", insertData);
      }

      // If OTP is enabled, show OTP field and send OTP
      if (otpEnabled) {
        console.log("OTP is enabled, showing OTP field");
        setShowOtpField(true);
        setOtpError(null);

        // Send OTP
        try {
          console.log("Sending OTP to:", values.email);
          if (verificationType === "email") {
            const { error: otpError } = await supabase.auth.signInWithOtp({
              email: values.email,
            });
            if (otpError) throw otpError;
            console.log("OTP sent successfully");
          } else if (verificationType === "phone") {
            const { error: otpError } = await supabase.auth.signInWithOtp({
              phone: values.phone,
            });
            if (otpError) throw otpError;
            console.log("OTP sent successfully");
          }

          toast({
            title: t("auth.otp_sent"),
            description: t("auth.enter_otp"),
          });
        } catch (otpError) {
          console.error("Error sending OTP:", otpError);
          toast({
            title: t("auth.register_failed"),
            description:
              otpError instanceof Error
                ? otpError.message
                : t("auth.registration_error"),
            variant: "destructive",
          });
        }
      } else {
        console.log("OTP is disabled, navigating to dashboard");
        // If OTP is disabled, show success and navigate
        toast({
          title: t("auth.register_success"),
          description: t("auth.register_success"),
        });
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      console.error("Registration error:", error);
      toast({
        title: t("auth.register_failed"),
        description:
          error instanceof Error ? error.message : t("auth.registration_error"),
        variant: "destructive",
      });
    }
  };

  const handleVerifyOtp = async () => {
    console.log("Starting OTP verification");
    setIsVerifying(true);
    try {
      const email = form.getValues("email");
      const otp = form.getValues("otp");
      console.log("Verifying OTP for email:", email, "OTP:", otp);

      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      console.log("OTP verification successful");
      setShowSuccessModal(true);
      toast({
        title: t("auth.otp_verification_success"),
        description: t("auth.otp_verification_success"),
      });
    } catch (error: unknown) {
      console.error("OTP verification error:", error);
      setOtpError(
        error instanceof Error ? error.message : t("auth.registration_error")
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError(null);
    setCanResend(false);
    setTimer(60);
    try {
      if (verificationType === "email") {
        const { error } = await supabase.auth.signInWithOtp({
          email: form.getValues("email"),
        });
        if (error) throw error;
      } else if (verificationType === "phone") {
        const { error } = await supabase.auth.signInWithOtp({
          phone: form.getValues("phone"),
        });
        if (error) throw error;
      }
      toast({ title: t("auth.otp_sent"), description: t("auth.enter_otp") });
    } catch (error: unknown) {
      setOtpError(
        error instanceof Error ? error.message : t("auth.registration_error")
      );
      toast({
        title: t("auth.register_failed"),
        description:
          error instanceof Error ? error.message : t("auth.registration_error"),
        variant: "destructive",
      });
    }
  };

  return (
    <div id="wrapper" className="flex flex-col min-h-screen">
      <Header />

      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main id="main" className="main">
            <div className="login">
              <div className="container">
                <div ref={heroRef} className="hero">
                  <div className="register__box">
                    <h2 className="c-title-1">
                      <span className="c-title-1__gradient c-title-1__gradient--white">
                        {t("auth.register_title")}
                      </span>
                    </h2>
                    <div className="c-border c-border--white"></div>
                    <div className="register__form">
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-6"
                        >
                          {!showOtpField && (
                            <>
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[14px]">
                                      {t("auth.full_name")}
                                    </FormLabel>
                                    <FormControl>
                                      <input
                                        placeholder={t(
                                          "auth.full_name_placeholder"
                                        )}
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
                                    <FormLabel className="text-[14px]">
                                      {t("auth.email")}
                                    </FormLabel>
                                    <FormControl>
                                      <input
                                        placeholder={t(
                                          "auth.email_placeholder"
                                        )}
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
                              <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[14px]">
                                      {t("auth.phone")}
                                    </FormLabel>
                                    <FormControl>
                                      <PhoneInput
                                        value={field.value}
                                        onChange={(value) => {
                                          field.onChange(value || "");
                                        }}
                                        defaultCountry="VN"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[14px]">
                                      {t("auth.password")}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <input
                                          type={
                                            showPassword ? "text" : "password"
                                          }
                                          placeholder={t(
                                            "auth.password_placeholder"
                                          )}
                                          className="text-[14px] min-h-7 pr-10 w-full"
                                          {...field}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            checkPasswordMatch(
                                              e.target.value,
                                              form.getValues("confirmPassword")
                                            );
                                          }}
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
                                control={form.control}
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
                                            showConfirmPassword
                                              ? "text"
                                              : "password"
                                          }
                                          placeholder={t(
                                            "auth.password_placeholder"
                                          )}
                                          className={`text-[14px] min-h-7 pr-10 w-full ${
                                            !passwordMatch && field.value
                                              ? "border-red-500"
                                              : ""
                                          }`}
                                          {...field}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            checkPasswordMatch(
                                              form.getValues("password"),
                                              e.target.value
                                            );
                                          }}
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
                                    <FormMessage className="text-red-500" />
                                    {!passwordMatch && field.value && (
                                      <div className="text-red-500 text-sm mt-1">
                                        {t("auth.password_match_validation")}
                                      </div>
                                    )}
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="account_type"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[14px]">
                                      {t("auth.account_type")}
                                    </FormLabel>
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="radio"
                                          id="ship_owner"
                                          name="account_type"
                                          value="Ship Owner"
                                          checked={field.value === "Ship Owner"}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label
                                          htmlFor="ship_owner"
                                          className="text-[14px]"
                                        >
                                          {t("auth.ship_owner")}
                                        </label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="radio"
                                          id="fleet_management"
                                          name="account_type"
                                          value="Fleet Management"
                                          checked={
                                            field.value === "Fleet Management"
                                          }
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label
                                          htmlFor="fleet_management"
                                          className="text-[14px]"
                                        >
                                          {t("auth.fleet_management")}
                                        </label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="radio"
                                          id="nm_processing"
                                          name="account_type"
                                          value="NM Processing"
                                          checked={
                                            field.value === "NM Processing"
                                          }
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label
                                          htmlFor="nm_processing"
                                          className="text-[14px]"
                                        >
                                          {t("auth.nm_processing")}
                                        </label>
                                      </div>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="account_package"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[14px]">
                                      {t("auth.account_package")}
                                    </FormLabel>
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="radio"
                                          id="gold"
                                          name="account_package"
                                          value="Gold"
                                          checked={field.value === "Gold"}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label
                                          htmlFor="gold"
                                          className="text-[14px]"
                                        >
                                          {t("auth.gold")}
                                        </label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="radio"
                                          id="premium"
                                          name="account_package"
                                          value="Premium"
                                          checked={field.value === "Premium"}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label
                                          htmlFor="premium"
                                          className="text-[14px]"
                                        >
                                          {t("auth.premium")}
                                        </label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <input
                                          type="radio"
                                          id="basic"
                                          name="account_package"
                                          value="Basic"
                                          checked={field.value === "Basic"}
                                          onChange={(e) =>
                                            field.onChange(e.target.value)
                                          }
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <label
                                          htmlFor="basic"
                                          className="text-[14px]"
                                        >
                                          {t("auth.basic")}
                                        </label>
                                      </div>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                          {showOtpField && (
                            <FormField
                              control={form.control}
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
                                  <div className="flex items-center gap-2 mt-2">
                                    <span>
                                      {canResend ? (
                                        <button
                                          type="button"
                                          onClick={handleResendOtp}
                                        >
                                          {t("auth.resend_otp")}
                                        </button>
                                      ) : (
                                        t("auth.resend_in", { seconds: timer })
                                      )}
                                    </span>
                                  </div>
                                  <FormMessage />
                                  {otpError && (
                                    <div className="text-red-500 text-xs mt-1">
                                      {otpError}
                                    </div>
                                  )}
                                </FormItem>
                              )}
                            />
                          )}

                          <div className="login__form-btn c-btn-1 c-btn-1--center">
                            <button
                              type={showOtpField ? "button" : "submit"}
                              className="c-btn-1__button"
                              disabled={isVerifying && !form.getValues("otp")}
                              onClick={
                                showOtpField ? handleVerifyOtp : undefined
                              }
                            >
                              {showOtpField
                                ? t("auth.verify_otp")
                                : t("auth.register_button")}
                            </button>
                          </div>
                        </form>
                      </Form>

                      <div className="register__form-forgot mt-5">
                        <a href="/login/">{t("auth.already_have_account")}</a>
                      </div>
                    </div>
                    <div className="c-border c-border--white"></div>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="text-center md:min-w-[400px] md:min-h-[300px]">
          <h2 className="text-xl font-semibold mb-2 text-[20px]">
            {t("auth.otp_verification_success")}
          </h2>
          <p className="mb-4">
            {verificationType === "email"
              ? t("auth.otp_verification_success_description_email")
              : t("auth.otp_verification_success_description_phone")}
          </p>
          <DialogFooter>
            <div className="mt-5 w-full text-center">
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/login");
                }}
                className="h-[50px] w-1/2 text-[18px]"
              >
                {t("auth.go_to_login")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
