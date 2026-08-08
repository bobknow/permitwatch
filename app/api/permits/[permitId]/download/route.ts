import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type RouteContext = {
  params: Promise<{
    permitId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { permitId } = await context.params;

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 }
    );
  }

  const { data: permit, error: permitError } =
    await supabase
      .from("permits")
      .select(`
        id,
        tenant_id,
        storage_path,
        source_filename
      `)
      .eq("id", permitId)
      .eq("tenant_id", profile.tenant_id)
      .single();

  if (permitError || !permit) {
    return NextResponse.json(
      { error: "Permit not found." },
      { status: 404 }
    );
  }

  if (!permit.storage_path) {
    return NextResponse.json(
      { error: "Permit document not found." },
      { status: 404 }
    );
  }

  const { data: file, error: downloadError } =
    await supabase.storage
      .from("permit-documents")
      .download(permit.storage_path);

  if (downloadError || !file) {
    console.error(
      "Permit download error:",
      downloadError
    );

    return NextResponse.json(
      { error: "Unable to download permit document." },
      { status: 500 }
    );
  }

  const fileBuffer = await file.arrayBuffer();

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        file.type || "application/pdf",
      "Content-Disposition": `attachment; filename="${permit.source_filename || "permit.pdf"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}