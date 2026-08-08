import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  try {
    const profile = await getCurrentProfile();

    if (!profile?.tenant_id) {
      return NextResponse.redirect(
        new URL("/login", requestUrl.origin)
      );
    }

    const supabase = await createClient();

    const { data: tenant, error } =
      await supabase
        .from("tenants")
        .select("stripe_customer_id")
        .eq("id", profile.tenant_id)
        .single();

    if (
      error ||
      !tenant?.stripe_customer_id
    ) {
      return NextResponse.redirect(
        new URL(
          "/pricing?error=no_billing_account",
          requestUrl.origin
        )
      );
    }

    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer:
          tenant.stripe_customer_id,

        return_url:
          `${requestUrl.origin}/settings`,
      });

    return NextResponse.redirect(
      portalSession.url
    );
  } catch (error) {
    console.error(
      "Billing portal error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/settings?error=billing_portal",
        requestUrl.origin
      )
    );
  }
}