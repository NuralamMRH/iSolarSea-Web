import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useNavigate } from "react-router-dom";
import { signIn } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  identifier: z.string().min(3, {
    message: "Please enter your email or phone number.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

const LoginContainer = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.login);
  const { isAuthenticated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      let session, user;
      // Try email login first
      if (values.identifier.includes("@")) {
        ({ session, user } = await signIn(values.identifier, values.password));
      } else {
        // Try phone login
        ({ session, user } = await signIn(
          values.identifier,
          values.password,
          true
        ));
      }
      setAuth(user, session.access_token);
      await checkAuth();

      toast({
        title: t("auth.login_success"),
        description: t("auth.welcome_back"),
      });

      navigate("/dashboard");
    } catch (error) {
      const err = error as Error;
      console.error("Login error:", err);
      toast({
        title: t("auth.login_failed"),
        description: err.message || t("auth.check_credentials"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="login__form">
      <Form {...form}>
        <form
          id="loginForm"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[14px]">{t("auth.email")}</FormLabel>
                <FormControl>
                  <input
                    placeholder={t("auth.email_placeholder")}
                    className="text-[14px] min-h-7"
                    {...field}
                    onChange={(e) => {
                      const lowercaseValue = e.target.value.toLowerCase();
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
                      onClick={() => setShowPassword(!showPassword)}
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
          <div className="mt-3 login__form-forgot">
            <a href="/forget-password/">{t("loginPage.forgot_password")}</a>
          </div>
          <div className="login__form-btn c-btn-1 c-btn-1--center">
            <button type="submit" className="c-btn-1__button">
              {t("loginPage.login_button")}
            </button>
          </div>
        </form>
      </Form>

      <div className="mt-5 login__form-register">
        <a href="/register/">{t("loginPage.no_account")}</a>
      </div>
    </div>
  );
};

export default LoginContainer;
