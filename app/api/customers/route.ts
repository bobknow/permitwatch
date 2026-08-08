import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const allowedCustomerTypes = [
  "property_management",
  "contractor",
  "building_owner",
  "other",
] as const;

type CustomerType = (typeof allowedCustomerTypes)[number];

type CustomerRequestBody = {
  name?: unknown;
  customer_type?: unknown;
  contact_name?: unknown;
  email?: unknown;
  phone?: unknown;
  address_line_1?: unknown;
  address_line_2?: unknown;
  city?: unknown;
  state?: unknown;
  postal_code?: unknown;
  notes?: unknown;
};

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Your session expired. Please sign in again." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json(
        { error: "Your account is not connected to a tenant." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CustomerRequestBody;

    const name = optionalText(body.name);
    const customerType =
      typeof body.customer_type === "string"
        ? body.customer_type.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        { error: "Customer or company name is required." },
        { status: 400 }
      );
    }

    if (
      !allowedCustomerTypes.includes(
        customerType as CustomerType
      )
    ) {
      return NextResponse.json(
        { error: "Select a valid customer type." },
        { status: 400 }
      );
    }

    const { data: customer, error: insertError } = await supabase
      .from("customers")
      .insert({
        tenant_id: profile.tenant_id,
        name,
        customer_type: customerType,
        contact_name: optionalText(body.contact_name),
        email: optionalText(body.email),
        phone: optionalText(body.phone),
        address_line_1: optionalText(body.address_line_1),
        address_line_2: optionalText(body.address_line_2),
        city: optionalText(body.city),
        state: optionalText(body.state),
        postal_code: optionalText(body.postal_code),
        notes: optionalText(body.notes),
        is_active: true,
        created_by: profile.id,
      })
      .select(`
        id,
        name,
        customer_type,
        contact_name,
        email,
        phone,
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

    if (insertError || !customer) {
      console.error("Customer insert error:", insertError);

      return NextResponse.json(
        {
          error:
            insertError?.message ?? "Unable to create customer.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { customer },
      { status: 201 }
    );
  } catch (error) {
    console.error("Customer API error:", error);

    return NextResponse.json(
      { error: "Unable to create customer." },
      { status: 500 }
    );
  }
}