import { NextResponse } from "next/server";

import {
  isSubscriptionActive,
} from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

const extensionsByType: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const maxFileSize = 25 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
      return NextResponse.json(
        {
          error:
            "Your session expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } =
      await supabase
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
      console.error(
        "Permit upload profile error:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Your account is not connected to an active organization.",
        },
        { status: 403 }
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
        "Permit upload tenant error:",
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
            "An active subscription is required to upload permits.",
          code: "subscription_required",
          subscription_status:
            tenant.subscription_status || "none",
        },
        { status: 402 }
      );
    }

    const formData = await request.formData();

    const fileValue = formData.get("file");
    const propertyIdValue =
      formData.get("property_id");
    const boilerIdValue =
      formData.get("boiler_id");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          error: "Permit file is required.",
        },
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
        {
          error:
            "Property and boiler are required.",
        },
        { status: 400 }
      );
    }

    if (fileValue.size === 0) {
      return NextResponse.json(
        {
          error:
            "The selected file is empty.",
        },
        { status: 400 }
      );
    }

    if (!allowedTypes.includes(fileValue.type as any)) {
      return NextResponse.json(
        {
          error:
            "Only PDF, JPG, JPEG, and PNG files are allowed.",
        },
        { status: 400 }
      );
    }

    if (fileValue.size > maxFileSize) {
      return NextResponse.json(
        {
          error:
            "The file must be 25 MB or smaller.",
        },
        { status: 400 }
      );
    }

    const { data: boiler, error: boilerError } =
      await supabase
        .from("boilers")
        .select(`
          id,
          property_id
        `)
        .eq("id", boilerId)
        .eq("property_id", propertyId)
        .eq("tenant_id", tenant.id)
        .single();

    if (boilerError || !boiler) {
      return NextResponse.json(
        {
          error: "Boiler not found.",
        },
        { status: 404 }
      );
    }

    const extension =
      extensionsByType[fileValue.type];

    const originalBaseName =
      fileValue.name.replace(/\.[^/.]+$/, "");

    const safeName =
      sanitizeFileName(originalBaseName) ||
      "permit";

    const uniqueName =
      `${crypto.randomUUID()}-${safeName}.${extension}`;

    uploadedStoragePath = [
      tenant.id,
      propertyId,
      boilerId,
      uniqueName,
    ].join("/");

    const fileBuffer =
      await fileValue.arrayBuffer();

    const { error: uploadError } =
      await supabase.storage
        .from("permit-documents")
        .upload(
          uploadedStoragePath,
          fileBuffer,
          {
            contentType: fileValue.type,
            upsert: false,
          }
        );

    if (uploadError) {
      console.error(
        "Permit storage upload error:",
        uploadError
      );

      return NextResponse.json(
        {
          error: uploadError.message,
        },
        { status: 500 }
      );
    }

    const {
      data: previousPermits,
      error: previousPermitError,
    } = await supabase
      .from("permits")
      .select(`
        id,
        status
      `)
      .eq("boiler_id", boilerId)
      .eq("tenant_id", tenant.id)
      .neq("status", "inactive");

    if (previousPermitError) {
      await supabase.storage
        .from("permit-documents")
        .remove([uploadedStoragePath]);

      return NextResponse.json(
        {
          error:
            "Unable to load the existing permit history.",
        },
        { status: 500 }
      );
    }

    const previousPermitIds =
      (previousPermits ?? []).map(
        (permit) => permit.id
      );

    if (previousPermitIds.length > 0) {
      const { error: archiveError } =
        await supabase
          .from("permits")
          .update({
            status: "inactive",
          })
          .in("id", previousPermitIds)
          .eq("tenant_id", tenant.id);

      if (archiveError) {
        await supabase.storage
          .from("permit-documents")
          .remove([uploadedStoragePath]);

        return NextResponse.json(
          {
            error:
              "Unable to archive the previous permit.",
          },
          { status: 500 }
        );
      }
    }

    const { data: permit, error: permitError } =
      await supabase
        .from("permits")
        .insert({
          tenant_id: tenant.id,
          boiler_id: boilerId,
          status: "pending",
          storage_path: uploadedStoragePath,
          source_filename: fileValue.name,
          ocr_status: "pending",
          created_by: profile.id,
        })
        .select(`
          id,
          tenant_id,
          boiler_id,
          status,
          storage_path,
          source_filename,
          ocr_status,
          created_at
        `)
        .single();

    if (permitError || !permit) {
      console.error(
        "Permit insert error:",
        permitError
      );

      await supabase.storage
        .from("permit-documents")
        .remove([uploadedStoragePath]);

      /*
       * Restore the previous permit statuses if the
       * new permit record could not be created.
       */
      for (const previousPermit of previousPermits ?? []) {
        await supabase
          .from("permits")
          .update({
            status: previousPermit.status,
          })
          .eq("id", previousPermit.id)
          .eq("tenant_id", tenant.id);
      }

      return NextResponse.json(
        {
          error:
            permitError?.message ??
            "Unable to create permit record.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { permit },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Permit upload API error:",
      error
    );

    if (uploadedStoragePath) {
      try {
        const supabase = await createClient();

        await supabase.storage
          .from("permit-documents")
          .remove([uploadedStoragePath]);
      } catch (cleanupError) {
        console.error(
          "Permit upload cleanup error:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload permit.",
      },
      { status: 500 }
    );
  }
}