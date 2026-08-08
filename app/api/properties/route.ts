import { NextResponse } from "next/server";

import {
  getPlanName,
  getPropertyLimit,
  isSubscriptionActive,
} from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

type PropertyRequestBody = {
  name?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  notes?: unknown;
  customer_id?: unknown;
};

function requiredText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Your session expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        tenant_id,
        is_active
      `)
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile?.tenant_id ||
      !profile.is_active
    ) {
      return NextResponse.json(
        {
          error:
            "Your account is not connected to an active organization.",
        },
        { status: 403 }
      );
    }

    const {
      data: tenant,
      error: tenantError,
    } = await supabase
      .from("tenants")
      .select(`
        id,
        is_active,
        subscription_plan,
        subscription_status
      `)
      .eq("id", profile.tenant_id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        {
          error:
            "Unable to load your organization subscription.",
        },
        { status: 403 }
      );
    }

    if (!tenant.is_active) {
      return NextResponse.json(
        {
          error:
            "This organization is currently disabled.",
        },
        { status: 403 }
      );
    }

    if (
      !isSubscriptionActive(
        tenant.subscription_status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "An active subscription is required to add properties.",
          code: "subscription_required",
          subscription_status:
            tenant.subscription_status || "none",
        },
        { status: 402 }
      );
    }

    const planName = getPlanName(
      tenant.subscription_plan
    );

    const propertyLimit =
      getPropertyLimit(planName);

    const {
      count: propertyCount,
      error: propertyCountError,
    } = await supabase
      .from("properties")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("tenant_id", tenant.id);

    if (propertyCountError) {
      console.error(
        "Unable to count properties:",
        propertyCountError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your property allowance.",
        },
        { status: 500 }
      );
    }

    const currentPropertyCount =
      propertyCount ?? 0;

    if (
      Number.isFinite(propertyLimit) &&
      currentPropertyCount >= propertyLimit
    ) {
      return NextResponse.json(
        {
          error:
            `Your ${planName} plan allows up to ${propertyLimit} properties.`,
          code: "property_limit",
          plan: planName,
          limit: propertyLimit,
        },
        { status: 403 }
      );
    }

    const body =
      (await req.json()) as PropertyRequestBody;

    const name = requiredText(body.name);
    const address = requiredText(body.address);
    const city = requiredText(body.city);

    const state = requiredText(
      body.state
    ).toUpperCase();

    const zip = requiredText(body.zip);

    const customerId = optionalText(
      body.customer_id
    );

    if (
      !name ||
      !address ||
      !city ||
      !state ||
      !zip
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required property information.",
        },
        { status: 400 }
      );
    }

    if (customerId) {
      const {
        data: customer,
        error: customerError,
      } = await supabase
        .from("customers")
        .select("id")
        .eq("id", customerId)
        .eq("tenant_id", tenant.id)
        .single();

      if (customerError || !customer) {
        return NextResponse.json(
          {
            error:
              "Selected customer was not found.",
          },
          { status: 404 }
        );
      }
    }

    const {
      data: property,
      error: insertError,
    } = await supabase
      .from("properties")
      .insert({
        tenant_id: tenant.id,
        customer_id: customerId,
        property_name: name,
        address_line_1: address,
        city,
        state,
        postal_code: zip,
        notes: optionalText(body.notes),
        is_active: true,
        created_by: user.id,
      })
      .select(`
        id,
        tenant_id,
        customer_id,
        property_name,
        address_line_1,
        address_line_2,
        city,
        state,
        postal_code,
        notes,
        is_active,
        created_at
      `)
      .single();

    if (insertError || !property) {
      console.error(
        "Property insert failed:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            insertError?.message ??
            "Unable to create property.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        property,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Unexpected property API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}