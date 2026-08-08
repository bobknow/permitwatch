import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const plans = {
  starter: {
    priceId:
      process.env.STRIPE_PRICE_STARTER_MONTHLY,
  },
  growth: {
    priceId:
      process.env.STRIPE_PRICE_GROWTH_MONTHLY,
  },
  professional: {
    priceId:
      process.env
        .STRIPE_PRICE_PROFESSIONAL_MONTHLY,
  },
} as const;

type PlanName = keyof typeof plans;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  try {
    const selectedPlan =
      requestUrl.searchParams.get("plan");

    if (
      !selectedPlan ||
      !(selectedPlan in plans)
    ) {
      return NextResponse.redirect(
        new URL(
          "/pricing?error=invalid_plan",
          requestUrl.origin
        )
      );
    }

    const planName = selectedPlan as PlanName;
    const priceId = plans[planName].priceId;

    if (!priceId) {
      console.error(
        `Missing Stripe Price ID for ${planName}`
      );

      return NextResponse.redirect(
        new URL(
          "/pricing?error=missing_price",
          requestUrl.origin
        )
      );
    }

    const profile = await getCurrentProfile();

    if (!profile?.tenant_id) {
      const loginUrl = new URL(
        "/login",
        requestUrl.origin
      );

      loginUrl.searchParams.set(
        "next",
        `/pricing`
      );

      return NextResponse.redirect(loginUrl);
    }

    const supabase = await createClient();

    const { data: tenant, error: tenantError } =
      await supabase
        .from("tenants")
        .select(`
          id,
          name,
          email,
          stripe_customer_id,
          stripe_subscription_id,
          subscription_status
        `)
        .eq("id", profile.tenant_id)
        .single();

    if (tenantError || !tenant) {
      console.error(
        "Billing tenant lookup failed:",
        tenantError
      );

      return NextResponse.redirect(
        new URL(
          "/pricing?error=tenant_not_found",
          requestUrl.origin
        )
      );
    }

    /*
 * Only subscriptions that can still be managed
 * should be sent to the billing portal.
 *
 * A fully canceled subscription keeps its Stripe
 * subscription ID for history, but the customer
 * must be allowed to create a new subscription.
 */
const manageableSubscriptionStatuses = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
];

if (
  tenant.stripe_subscription_id &&
  tenant.subscription_status &&
  manageableSubscriptionStatuses.includes(
    tenant.subscription_status
  )
) {
  return NextResponse.redirect(
    new URL(
      "/api/billing/portal",
      requestUrl.origin
    )
  );
}

    let customerId =
      tenant.stripe_customer_id;

    if (!customerId) {
      const customer =
        await stripe.customers.create({
          name: tenant.name,
          email:
            tenant.email ||
            profile.email ||
            undefined,
          metadata: {
            tenant_id: tenant.id,
          },
        });

      customerId = customer.id;

      const { error: customerSaveError } =
        await supabase
          .from("tenants")
          .update({
            stripe_customer_id: customerId,
          })
          .eq("id", tenant.id);

      if (customerSaveError) {
        console.error(
          "Stripe customer save failed:",
          customerSaveError
        );

        return NextResponse.redirect(
          new URL(
            "/pricing?error=customer_save",
            requestUrl.origin
          )
        );
      }
    }

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        client_reference_id: tenant.id,

        metadata: {
          tenant_id: tenant.id,
          plan: planName,
        },

        subscription_data: {
          metadata: {
            tenant_id: tenant.id,
            plan: planName,
          },
        },

        success_url:
          `${requestUrl.origin}/billing/success` +
          `?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${requestUrl.origin}/pricing` +
          `?checkout=cancelled`,

        allow_promotion_codes: true,
        billing_address_collection: "auto",
      });

    if (!checkoutSession.url) {
      throw new Error(
        "Stripe did not return a checkout URL."
      );
    }

    return NextResponse.redirect(
      checkoutSession.url
    );
  } catch (error) {
    console.error(
      "Stripe checkout error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/pricing?error=checkout_failed",
        requestUrl.origin
      )
    );
  }
}