import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the invitation data from the request body
    const { invitationId, email, invitationCode, vesselName, role, expiresAt } =
      await req.json();

    // Generate the invitation URL
    const baseUrl = Deno.env.get("SITE_URL") || "http://localhost:3000";
    const invitationUrl = `${baseUrl}/vessel-invitation/${invitationCode}`;

    // Email template
    const emailSubject = `Vessel Access Invitation - ${vesselName}`;
    const emailBody = `
Hello,

You have been invited to access the vessel "${vesselName}" with the role of ${role}.

To accept this invitation, please click on the following link:
${invitationUrl}

Or copy and paste this invitation code: ${invitationCode}

This invitation expires on: ${new Date(expiresAt).toLocaleDateString()}

If you don't have an account, you'll be prompted to create one when you accept the invitation.

Best regards,
The iTruckSea Team
    `.trim();

    // For now, we'll just log the email details
    // In a real implementation, you would integrate with an email service like SendGrid, Mailgun, etc.
    console.log("Email Details:", {
      to: email,
      subject: emailSubject,
      body: emailBody,
      invitationUrl,
      invitationCode,
    });

    // Update the invitation record to mark that email was sent
    const { error: updateError } = await supabaseClient
      .from("vessel_access_invitations")
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email details logged",
        emailDetails: {
          to: email,
          subject: emailSubject,
          body: emailBody,
          invitationUrl,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
