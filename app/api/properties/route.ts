import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();

    if (!profile) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (!body.name || !body.address || !body.city || !body.state || !body.zip) {
      return NextResponse.json(
        { error: "Missing required property information." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("properties")
      .insert({
        tenant_id: profile.tenant_id,
        property_name: body.name.trim(),
        address_line_1: body.address.trim(),
        city: body.city.trim(),
        state: body.state.trim().toUpperCase(),
        postal_code: body.zip.trim(),
        notes: body.notes?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Property insert failed:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        property: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected property API error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}