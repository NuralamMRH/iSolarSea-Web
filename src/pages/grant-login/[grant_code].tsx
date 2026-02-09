import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { PhoneInput } from "@/components/ui/phone-input";

type GrantLink = Database["public"]["Tables"]["grant_links"]["Row"];
type CrewMember = {
  id: string;
  vessel_id: string;
  name: string;
  role: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  created_at?: string;
  document_id?: string | null;
};
type Vessel = Database["public"]["Tables"]["vessels"]["Row"];

const GrantLoginPage = () => {
  const navigate = useNavigate();
  const { grant_code } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [grant, setGrant] = useState<GrantLink | null>(null);
  const [crew, setCrew] = useState<CrewMember | null>(null);
  const [vessel, setVessel] = useState<Vessel | null>(null);
  const [step, setStep] = useState<
    | "info"
    | "otp"
    | "done"
    | "error"
    | "expired"
    | "already-logged-in"
    | "rejected"
  >("info");
  const [otp, setOtp] = useState("");
  const [sentOtp, setSentOtp] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [createdPhone, setCreatedPhone] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  useEffect(() => {
    console.log("phone ", phone);
  }, [phone]);

  // 1. Fetch grant link, crew, vessel, and check user
  useEffect(() => {
    (async () => {
      setLoading(true);

      // Check if user is logged in
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUserId(userData.user.id);
      }

      if (!grant_code) {
        setStep("error");
        setLoading(false);
        return;
      }

      // Fetch grant link
      const { data: grantData, error } = await supabase
        .from("grant_links")
        .select("*")
        .eq("grant_code", grant_code)
        .single();

      if (error || !grantData) {
        setStep("error");
        setLoading(false);
        return;
      }
      setGrant(grantData);

      // Check expiry (created_at + 3 days)
      const createdAt = new Date(grantData.created_at);
      const expiresAt = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
      if (new Date() > expiresAt) {
        setStep("expired");
        setLoading(false);
        return;
      }

      // Fetch crew info
      const { data: crewData } = await supabase
        .from("crew_members")
        .select("*")
        .eq("id", grantData.crew_id)
        .single();

      setCrew(crewData as unknown as CrewMember);
      setPhone(crewData?.phone || "");
      setEmail(crewData?.email || "");

      // Fetch vessel info
      const { data: vesselData } = await supabase
        .from("vessels")
        .select("*")
        .eq("id", grantData.vessel_id)
        .single();
      setVessel(vesselData);

      // If user is logged in, update granted_by and show success
      if (userData?.user) {
        await supabase
          .from("grant_links")
          .update({ granted_by: userData.user.id })
          .eq("id", grantData.id);
        setStep("already-logged-in");
        setLoading(false);
        return;
      }

      setLoading(false);
    })();
  }, [grant_code]);

  // 2. Accept Grant: send OTP
  const handleAcceptGrant = async () => {
    setLoading(true);
    try {
      // Check if user is already logged in
      const { data: userData } = await supabase.auth.getUser();
      let authUserId = userData?.user?.id;
      let session = null;
      let user = null;
      const phoneToUse = phone || crew?.phone;
      if (!phoneToUse) {
        toast({
          title: "Cannot create account",
          description: "No phone number found for this crew member.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const demoEmail = `${crew?.role}${phoneToUse.replace(
        /[^0-9]/g,
        ""
      )}@itrucksea.com`;
      const password =
        Math.random().toString(36).slice(-10) +
        Math.random().toString(36).slice(-10);
      const roleToUse = crew?.role && crew.role;
      if (!authUserId) {
        // Create Supabase Auth account
        const signUpRes = await supabase.auth.signUp({
          email: demoEmail,
          password,
          options: {
            data: {
              name: crew?.name,
              role: roleToUse,
            },
          },
        });
        if (signUpRes.error || !signUpRes.data.user) {
          throw new Error(
            signUpRes.error?.message || "Failed to create account"
          );
        }
        authUserId = signUpRes.data.user.id;
        session = signUpRes.data.session;
        user = signUpRes.data.user;
        setCreatedPhone(phoneToUse);
        setCreatedPassword(password);
        setCreatedEmail(demoEmail);
        // If not logged in, log in manually
        if (!session) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: demoEmail,
              password,
            });
          if (signInError || !signInData.session) {
            throw new Error(
              signInError?.message || "Failed to log in after sign up"
            );
          }
        }
      }

      console.log("authUserId ", authUserId);
      // Insert into users table if not present
      if (authUserId) {
        const { data: registerUser, error: registerError } = await supabase
          .from("users")
          .insert([
            {
              auth_id: authUserId,
              email: demoEmail,
              name: crew?.name || "",
              role: roleToUse,
              phone: phoneToUse,
              grant_id: grant!.id,
              is_approved: true,
              is_email_verified: false,
              is_phone_verified: false,
            },
          ])
          .select("id")
          .single();
        console.log("registerUser ", registerUser);
        console.log("registerError ", registerError);
      }

      // Mark grant link as accepted
      await supabase
        .from("grant_links")
        .update({
          is_used: true,
          status: "accepted",
          used_at: new Date().toISOString(),
          granted_by: authUserId,
        })
        .eq("id", grant!.id);

      toast({
        title: "Account created and grant accepted!",
        variant: "default",
      });
      setStep("done");
      // Do not redirect, show login info instead
    } catch (error: unknown) {
      toast({
        title: "Failed to accept grant",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Add handleRejectGrant
  const handleRejectGrant = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authUserId = userData?.user?.id;
      await supabase
        .from("grant_links")
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
          granted_by: authUserId,
        })
        .eq("id", grant!.id);
      toast({
        title: "Grant request rejected!",
        variant: "default",
      });
      setStep("rejected");
    } catch (error: unknown) {
      toast({
        title: "Failed to reject grant",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (step === "error" || !grant)
    return (
      <div className="p-8 text-center text-red-600">
        Invalid or expired grant link.
      </div>
    );
  if (step === "expired")
    return (
      <div className="p-8 text-center text-red-600">
        This grant link has expired.
      </div>
    );
  if (step === "already-logged-in")
    return (
      <div className="p-8 text-center text-green-600">
        <span className="text-red-600 font-bold text-2xl">
          Now can access the vessel account as {crew?.role}
        </span>
        <br />
        <span className="text-green-600 font-bold text-2xl">
          Grant link marked as used.
        </span>
      </div>
    );
  if (grant?.is_used)
    return (
      <div className="p-8 text-center text-green-600">
        This grant link has already been accepted.
      </div>
    );
  if (step === "rejected")
    return (
      <div className="p-8 text-center text-red-600">
        This grant link has been rejected.
      </div>
    );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Grant Vessel Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div>
              <b>Vessel ID:</b> {vessel?.registration_number}
            </div>
            <div>
              <b>Name:</b> {crew?.name}
            </div>
            <div>
              <b>Role:</b> {crew?.role}
            </div>
            <div>
              <b>Phone:</b> {phone}
            </div>
            {email && (
              <div>
                <b>Email:</b> {email}
              </div>
            )}
          </div>

          {step == "info" && (
            <div className="flex gap-4">
              <Button
                type="button"
                className="w-full"
                disabled={loading}
                onClick={handleAcceptGrant}
              >
                {loading ? "Processing..." : "Accept Request"}
              </Button>
              <Button
                type="button"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
                onClick={handleRejectGrant}
              >
                {loading ? "Processing..." : "Reject"}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="mt-4 text-green-600">
              <div>
                <b>Login Phone:</b> {createdPhone}
                <button
                  className="ml-2 px-2 py-1 border rounded text-xs"
                  onClick={() =>
                    createdPhone && navigator.clipboard.writeText(createdPhone)
                  }
                >
                  Copy
                </button>
              </div>
              <div className="mt-2">
                <b>Login Email:</b> {createdEmail}
                <button
                  className="ml-2 px-2 py-1 border rounded text-xs"
                  onClick={() =>
                    createdEmail && navigator.clipboard.writeText(createdEmail)
                  }
                >
                  Copy
                </button>
              </div>
              <div className="mt-2">
                <b>Password:</b> {createdPassword}
                <button
                  className="ml-2 px-2 py-1 border rounded text-xs"
                  onClick={() =>
                    createdPassword &&
                    navigator.clipboard.writeText(createdPassword)
                  }
                >
                  Copy
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Please save this information for future logins. You are now
                logged in.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GrantLoginPage;
