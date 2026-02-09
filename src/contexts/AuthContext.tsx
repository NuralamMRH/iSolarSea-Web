import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "../types/user";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { Database } from "@/integrations/supabase/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  checkAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Database["public"]["Tables"]["users"]["Row"] | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        // Get user profile from database
        const { data: userData, error } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authUser.id)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
          return;
        }

        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial auth check
    checkAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        checkAuth();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        navigate("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, loading, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated && !user) {
      navigate("/login");
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please login to access this page",
      });
    }
  }, [user, location, isAuthenticated, navigate]);

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !["super_admin", "admin"].includes(user.role))) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Admin privileges required.",
      });
      navigate("/", { state: { from: location.pathname } });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return user && ["super_admin", "admin"].includes(user.role) ? (
    <>{children}</>
  ) : null;
}
