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
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/use-translation";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Eye, EyeOff } from "lucide-react";
import LoginContainer from "@/components/LoginContainer";

const formSchema = z.object({
  identifier: z.string().min(3, {
    message: "Please enter your email or phone number.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.login);
  const { isAuthenticated } = useAuthStore();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const box1Ref = useRef<HTMLDivElement | null>(null);
  const box2Ref = useRef<HTMLDivElement | null>(null);
  const areaRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [showPassword, setShowPassword] = useState(false);

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
    <div id="wrapper" className="flex flex-col min-h-screen">
      <Header />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main id="main" className="main font-[13px]">
            <div className="login">
              <div className="container">
                <div ref={heroRef} className="hero">
                  <div className="login__box">
                    <h2 className="c-title-1">
                      <span className="c-title-1__gradient c-title-1__gradient--white">
                        {t("loginPage.heading")}
                      </span>
                    </h2>
                    <div className="c-border c-border--white"></div>

                    <LoginContainer />
                    <div className="c-border c-border--white"></div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;
