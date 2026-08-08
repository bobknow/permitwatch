import { NextResponse } from "next/server";

import { isSubscriptionActive } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const profile = await getCurrentProfile();

    if (!profile) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    if (!profile.tenant_id) {
      return NextResponse.json(
        {
          error:
            "Your account is not connected to a tenant.",
        },
        { status: 400 }
      );
    }

    const { data: tenant, error: tenantError } =
      await supabase
        .from("tenants")
        .select(`
          id,
          is_active,
          subscription_status,
          subscription_plan
        `)
        .eq("id", profile.tenant_id)
        .single();

    if (tenantError || !tenant) {
      console.error(
        "Boiler tenant lookup error:",
        tenantError
      );

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
            "An active subscription is required to add boilers.",
          code: "subscription_required",
          subscription_status:
            tenant.subscription_status || "none",
        },
        { status: 402 }
      );
    }

    const body = await request.json();

    const propertyId =
      typeof body.property_id === "string"
        ? body.property_id.trim()
        : "";

    const boilerNumber =
      typeof body.boiler_number === "string"
        ? body.boiler_number.trim()
        : "";

    const modelNumber =
      typeof body.model_number === "string" &&
      body.model_number.trim()
        ? body.model_number.trim()
        : null;

    const serialNumber =
      typeof body.serial_number === "string" &&
      body.serial_number.trim()
        ? body.serial_number.trim()
        : null;

    if (!propertyId) {
      return NextResponse.json(
        {
          error: "Property ID is required.",
        },
        { status: 400 }
      );
    }

    if (!boilerNumber) {
      return NextResponse.json(
        {
          error: "Boiler number is required.",
        },
        { status: 400 }
      );
    }

    const { data: property, error: propertyError } =
      await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("tenant_id", tenant.id)
        .single();

    if (propertyError || !property) {
      return NextResponse.json(
        {
          error: "Property not found.",
        },
        { status: 404 }
      );
    }

    const {
      data: existingBoiler,
      error: existingBoilerError,
    } = await supabase
      .from("boilers")
      .select("id")
      .eq("property_id", propertyId)
      .eq("boiler_number", boilerNumber)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (existingBoilerError) {
      console.error(
        "Boiler duplicate lookup error:",
        existingBoilerError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify the boiler number.",
        },
        { status: 500 }
      );
    }

    if (existingBoiler) {
      return NextResponse.json(
        {
          error:
            `Boiler #${boilerNumber} already exists at this property.`,
        },
        { status: 409 }
      );
    }

    const { data: boiler, error: boilerError } =
      await supabase
        .from("boilers")
        .insert({
          tenant_id: tenant.id,
          property_id: propertyId,
          boiler_number: boilerNumber,
          model_number: modelNumber,
          serial_number: serialNumber,
          created_by: profile.id,
        })
        .select()
        .single();

    if (boilerError || !boiler) {
      console.error(
        "Boiler insert error:",
        boilerError
      );

      return NextResponse.json(
        {
          error:
            boilerError?.message ??
            "Unable to create boiler.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { boiler },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Boiler API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save boiler.",
      },
      { status: 500 }
    );
  }
}