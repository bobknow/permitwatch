import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const maxFileSize = 25 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(request: Request) {
  let uploadedStoragePath: string | null = null;

  try {
    const supabase = await createClient();

const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
  console.error("Permit upload auth error:", userError);

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

if (profileError || !profile) {
  console.error("Permit upload profile error:", profileError);

  return NextResponse.json(
    { error: "Your profile could not be loaded." },
    { status: 400 }
  );
}

if (!profile.tenant_id) {
  return NextResponse.json(
    { error: "Your account is not connected to a tenant." },
    { status: 400 }
  );
}

    const formData = await request.formData();

    const fileValue = formData.get("file");
    const propertyIdValue = formData.get("property_id");
    const boilerIdValue = formData.get("boiler_id");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "Permit file is required." },
        { status: 400 }
      );
    }

    const propertyId =
      typeof propertyIdValue === "string"
        ? propertyIdValue.trim()
        : "";

    const boilerId =
      typeof boilerIdValue === "string"
        ? boilerIdValue.trim()
        : "";

    if (!propertyId || !boilerId) {
      return NextResponse.json(
        { error: "Property and boiler are required." },
        { status: 400 }
      );
    }

    if (!allowedTypes.includes(fileValue.type)) {
      return NextResponse.json(
        { error: "Only PDF, JPG, JPEG, and PNG files are allowed." },
        { status: 400 }
      );
    }

    if (fileValue.size > maxFileSize) {
      return NextResponse.json(
        { error: "The file must be 25 MB or smaller." },
        { status: 400 }
      );
    }

    const { data: boiler, error: boilerError } = await supabase
      .from("boilers")
      .select(`
        id,
        property_id
      `)
      .eq("id", boilerId)
      .eq("property_id", propertyId)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (boilerError || !boiler) {
      return NextResponse.json(
        { error: "Boiler not found." },
        { status: 404 }
      );
    }

    const extension =
      fileValue.name.split(".").pop()?.toLowerCase() || "file";

    const safeName = sanitizeFileName(
      fileValue.name.replace(/\.[^/.]+$/, "")
    );

    const uniqueName = `${crypto.randomUUID()}-${safeName}.${extension}`;

    uploadedStoragePath = [
      profile.tenant_id,
      propertyId,
      boilerId,
      uniqueName,
    ].join("/");

    const fileBuffer = await fileValue.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("permit-documents")
      .upload(uploadedStoragePath, fileBuffer, {
        contentType: fileValue.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Permit storage upload error:", uploadError);

      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: permit, error: permitError } = await supabase
      .from("permits")
      .insert({
        tenant_id: profile.tenant_id,
        boiler_id: boilerId,
        status: "pending",
        storage_path: uploadedStoragePath,
        source_filename: fileValue.name,
        ocr_status: "pending",
        created_by: profile.id,
      })
      .select()
      .single();

    if (permitError) {
      console.error("Permit insert error:", permitError);

      await supabase.storage
        .from("permit-documents")
        .remove([uploadedStoragePath]);

      return NextResponse.json(
        { error: permitError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { permit },
      { status: 201 }
    );
  } catch (error) {
    console.error("Permit upload API error:", error);

    return NextResponse.json(
      { error: "Unable to upload permit." },
      { status: 500 }
    );
  }
}