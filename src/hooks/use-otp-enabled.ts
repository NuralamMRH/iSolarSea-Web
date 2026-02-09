import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOtpEnabled() {
  const [otpEnabled, setOtpEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("otp_enabled")
        .order("id", { ascending: false })
        .limit(1)
        .single();
      setOtpEnabled(
        (data as { otp_enabled?: boolean } | null)?.otp_enabled ?? true
      );
    })();
  }, []);

  return otpEnabled;
}
