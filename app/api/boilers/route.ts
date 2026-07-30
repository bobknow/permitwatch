import { NextResponse } from "next/server";
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
        { error: "Your account is not connected to a tenant." },
        { status: 400 }
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
        { error: "Property ID is required." },
        { status: 400 }
      );
    }

    if (!boilerNumber) {
      return NextResponse.json(
        { error: "Boiler number is required." },
        { status: 400 }
      );
    }

    const { data: property, error: propertyError } =
      await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("tenant_id", profile.tenant_id)
        .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found." },
        { status: 404 }
      );
    }

    const { data: boiler, error: boilerError } =
      await supabase
        .from("boilers")
        .insert({
          tenant_id: profile.tenant_id,
          property_id: propertyId,
          boiler_number: boilerNumber,
          model_number: modelNumber,
          serial_number: serialNumber,
          created_by: profile.id,
        })
        .select()
        .single();

    if (boilerError) {
      console.error("Boiler insert error:", boilerError);

      return NextResponse.json(
        { error: boilerError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { boiler },
      { status: 201 }
    );
  } catch (error) {
    console.error("Boiler API error:", error);

    return NextResponse.json(
      { error: "Unable to save boiler." },
      { status: 500 }
    );
  }
}