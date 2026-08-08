import Stripe from "stripe";
import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function toIsoDate(
  unixTimestamp: number | null | undefined
) {
  if (!unixTimestamp) {
    return null;
  }

  return new Date(
    unixTimestamp * 1000
  ).toISOString();
}

function getPlanFromPriceId(
  priceId: string | null | undefined
) {
  if (
    priceId ===
    process.env.STRIPE_PRICE_STARTER_MONTHLY
  ) {
    return "starter";
  }

  if (
    priceId ===
    process.env.STRIPE_PRICE_GROWTH_MONTHLY
  ) {
    return "growth";
  }

  if (
    priceId ===
    process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY
  ) {
    return "professional";
  }

  return null;
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
) {
  if (!customer) {
    return null;
  }

  return typeof customer === "string"
    ? customer
    : customer.id;
}

async function updateTenantFromSubscription(
  subscription: Stripe.Subscription
) {
  const customerId = getCustomerId(
    subscription.customer
  );

  /*
   * Prefer tenant_id stored on the subscription.
   * If metadata is ever missing, fall back to the
   * Stripe customer already connected to a tenant.
   */
  let tenantId =
    subscription.metadata.tenant_id || null;

  if (!tenantId && customerId) {
    const {
      data: tenant,
      error: tenantLookupError,
    } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq(
        "stripe_customer_id",
        customerId
      )
      .maybeSingle();

    if (tenantLookupError) {
      throw new Error(
        `Unable to locate tenant from Stripe customer: ${tenantLookupError.message}`
      );
    }

    tenantId = tenant?.id ?? null;
  }

  if (!tenantId) {
    console.error(
      "Stripe subscription could not be matched to a tenant:",
      subscription.id
    );

    return;
  }

  const subscriptionItem =
    subscription.items.data[0];

  const priceId =
    subscriptionItem?.price?.id ?? null;

  /*
   * Price ID is the source of truth for the plan.
   * Subscription metadata may contain an old plan
   * after an upgrade or downgrade.
   */
  const plan =
    getPlanFromPriceId(priceId);

  if (!plan && priceId) {
    console.error(
      "Unknown Stripe price ID:",
      priceId
    );
  }

  const periodEnd =
    subscriptionItem?.current_period_end;

  const trialEnd =
    subscription.trial_end;

  const hasAccess =
    subscription.status === "active" ||
    subscription.status === "trialing";

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({
      stripe_customer_id: customerId,

      stripe_subscription_id:
        subscription.id,

      stripe_price_id: priceId,

      subscription_status:
        subscription.status,

      ...(plan
        ? {
            subscription_plan: plan,
          }
        : {}),

      trial_ends_at:
        toIsoDate(trialEnd),

      subscription_ends_at:
        toIsoDate(periodEnd),

      is_active: hasAccess,
    })
    .eq("id", tenantId);

  if (error) {
    throw new Error(
      `Unable to update tenant subscription: ${error.message}`
    );
  }
}

async function syncSubscriptionForCustomer(
  customerId: string
) {
  const {
    data: tenant,
    error: tenantError,
  } = await supabaseAdmin
    .from("tenants")
    .select(`
      id,
      stripe_subscription_id
    `)
    .eq(
      "stripe_customer_id",
      customerId
    )
    .maybeSingle();

  if (tenantError) {
    throw new Error(
      `Unable to locate billing tenant: ${tenantError.message}`
    );
  }

  if (
    !tenant?.stripe_subscription_id
  ) {
    console.log(
      "No Stripe subscription stored for customer:",
      customerId
    );

    return;
  }

  const subscription =
    await stripe.subscriptions.retrieve(
      tenant.stripe_subscription_id
    );

  await updateTenantFromSubscription(
    subscription
  );
}

export async function POST(
  request: Request
) {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET is not configured.",
      },
      { status: 500 }
    );
  }

  const signature =
    request.headers.get(
      "stripe-signature"
    );

  if (!signature) {
    return NextResponse.json(
      {
        error:
          "Missing Stripe signature.",
      },
      { status: 400 }
    );
  }

  const rawBody =
    await request.text();

  let event: Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "Stripe webhook signature error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Webhook signature verification failed.",
      },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      /*
       * Checkout creates the initial connection.
       * We save the Stripe IDs here, but the
       * subscription event remains the authority
       * for plan and subscription status.
       */
      case "checkout.session.completed": {
        const session =
          event.data
            .object as Stripe.Checkout.Session;

        const tenantId =
          session.metadata?.tenant_id ||
          session.client_reference_id;

        if (!tenantId) {
          console.error(
            "Checkout session missing tenant ID:",
            session.id
          );

          break;
        }

        const customerId =
          getCustomerId(
            session.customer
          );

        const subscriptionId =
          typeof session.subscription ===
          "string"
            ? session.subscription
            : session.subscription?.id ??
              null;

        const { error } =
          await supabaseAdmin
            .from("tenants")
            .update({
              stripe_customer_id:
                customerId,

              stripe_subscription_id:
                subscriptionId,
            })
            .eq("id", tenantId);

        if (error) {
          throw new Error(
            `Checkout update failed: ${error.message}`
          );
        }

        /*
         * Sync immediately instead of waiting
         * for event ordering.
         */
        if (subscriptionId) {
          const subscription =
            await stripe.subscriptions.retrieve(
              subscriptionId
            );

          await updateTenantFromSubscription(
            subscription
          );
        }

        break;
      }

      /*
       * These are the main subscription lifecycle
       * events.
       */
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription =
          event.data
            .object as Stripe.Subscription;

        await updateTenantFromSubscription(
          subscription
        );

        break;
      }

      /*
       * A successful invoice may follow a renewal,
       * retry, plan change, or payment recovery.
       * Pull the subscription directly from Stripe
       * so Supabase receives the current truth.
       */
      case "invoice.paid": {
        const invoice =
          event.data
            .object as Stripe.Invoice;

        const customerId =
          getCustomerId(
            invoice.customer
          );

        if (customerId) {
          await syncSubscriptionForCustomer(
            customerId
          );
        }

        break;
      }

      /*
       * Same idea on payment failure:
       * retrieve the current subscription from
       * Stripe instead of guessing its status.
       */
      case "invoice.payment_failed": {
        const invoice =
          event.data
            .object as Stripe.Invoice;

        const customerId =
          getCustomerId(
            invoice.customer
          );

        if (customerId) {
          await syncSubscriptionForCustomer(
            customerId
          );
        }

        break;
      }

      default:
        console.log(
          `Unhandled Stripe event: ${event.type}`
        );
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}