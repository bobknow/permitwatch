import OpenAI from "openai";
import { NextResponse } from "next/server";

import { isSubscriptionActive } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type RouteContext = {
  params: Promise<{
    permitId: string;
  }>;
};

type ExtractedPermit = {
  permit_number: string | null;
  issued_date: string | null;
  inspection_date: string | null;
  expiration_date: string | null;
  installation_address: string | null;
  boiler_serial: string | null;
  boiler_number: string | null;
  boiler_manufacturer: string | null;
  boiler_type: string | null;
  pressure: number | string | null;
  inspector_name: string | null;
  inspector_firm: string | null;
  inspector_phone: string | null;
  notes: string | null;
  confidence: number | null;
};

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizePressure(value: unknown) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const pressure = Number(match[0]);

  return Number.isFinite(pressure)
    ? pressure
    : null;
}

function normalizeConfidence(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.max(0, Math.min(1, value));
}

function parseExtractedPermit(outputText: string) {
  const cleaned = outputText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "");

  return JSON.parse(cleaned) as ExtractedPermit;
}

function calculatePermitStatus(
  expirationDate: string | null
) {
  if (!expirationDate) {
    return "pending";
  }

  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const expiration = new Date(
    `${expirationDate}T00:00:00`
  );

  const daysRemaining = Math.ceil(
    (expiration.getTime() -
      todayStart.getTime()) /
      86_400_000
  );

  if (daysRemaining < 0) {
    return "expired";
  }

  if (daysRemaining <= 30) {
    return "due_soon";
  }

  return "current";
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  const { permitId } = await context.params;
  const supabase = await createClient();

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
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

    /*
     * Check billing before downloading the document
     * or making an OpenAI request.
     */
    const {
      data: tenant,
      error: tenantError,
    } = await supabase
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
        "Permit OCR tenant error:",
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
            "An active subscription is required to process permit documents.",
          code: "subscription_required",
          subscription_status:
            tenant.subscription_status || "none",
        },
        { status: 402 }
      );
    }

    const {
      data: permit,
      error: permitError,
    } = await supabase
      .from("permits")
      .select(`
        id,
        tenant_id,
        boiler_id,
        source_filename,
        storage_path
      `)
      .eq("id", permitId)
      .eq("tenant_id", tenant.id)
      .single();

    if (permitError || !permit) {
      return NextResponse.json(
        {
          error: "Permit not found.",
        },
        { status: 404 }
      );
    }

    if (!permit.storage_path) {
      return NextResponse.json(
        {
          error:
            "Permit has no uploaded document.",
        },
        { status: 400 }
      );
    }

    const { error: processingError } =
      await supabase
        .from("permits")
        .update({
          ocr_status: "processing",
        })
        .eq("id", permit.id)
        .eq("tenant_id", tenant.id);

    if (processingError) {
      throw new Error(
        `Unable to begin extraction: ${processingError.message}`
      );
    }

    const {
      data: file,
      error: downloadError,
    } = await supabase.storage
      .from("permit-documents")
      .download(permit.storage_path);

    if (downloadError || !file) {
      throw new Error(
        "Unable to download permit."
      );
    }

    const fileBuffer = Buffer.from(
      await file.arrayBuffer()
    );

    const mimeType =
      file.type || "application/pdf";

    const response =
      await openai.responses.create({
        model: "gpt-5-mini",

        input: [
          {
            role: "user",

            content: [
              {
                type: "input_text",

                text: `
Read this boiler Permit to Operate document.

Extract only information clearly visible in the document.
Do not infer or guess missing information.

Return only valid JSON, with no Markdown or explanation.
Use null when a value is not present.
Format all dates as YYYY-MM-DD.
Return pressure as a number only, without units.
Confidence must be a number from 0 through 1.

{
  "permit_number": null,
  "issued_date": null,
  "inspection_date": null,
  "expiration_date": null,
  "installation_address": null,
  "boiler_serial": null,
  "boiler_number": null,
  "boiler_manufacturer": null,
  "boiler_type": null,
  "pressure": null,
  "inspector_name": null,
  "inspector_firm": null,
  "inspector_phone": null,
  "notes": null,
  "confidence": 0.0
}
                `.trim(),
              },

              {
                type: "input_file",

                filename:
                  permit.source_filename ||
                  "permit.pdf",

                file_data:
                  `data:${mimeType};base64,` +
                  fileBuffer.toString("base64"),
              },
            ],
          },
        ],
      });

    if (!response.output_text?.trim()) {
      throw new Error(
        "The extraction service returned no content."
      );
    }

    const extracted =
      parseExtractedPermit(
        response.output_text
      );

    console.log(
      "Permit OCR completed:",
      permit.id
    );

    const permitNumber = optionalText(
      extracted.permit_number
    );

    const issuedDate = optionalText(
      extracted.issued_date
    );

    const inspectionDate = optionalText(
      extracted.inspection_date
    );

    const expirationDate = optionalText(
      extracted.expiration_date
    );

    const boilerSerial = optionalText(
      extracted.boiler_serial
    );

    const pressure = normalizePressure(
      extracted.pressure
    );

    const confidence =
      normalizeConfidence(
        extracted.confidence
      );

    const status =
      calculatePermitStatus(
        expirationDate
      );

    const {
      error: permitUpdateError,
    } = await supabase
      .from("permits")
      .update({
        permit_number: permitNumber,
        issued_date: issuedDate,
        inspection_date: inspectionDate,
        expiration_date: expirationDate,

        installation_address:
          optionalText(
            extracted.installation_address
          ),

        inspector_name:
          optionalText(
            extracted.inspector_name
          ),

        inspector_firm:
          optionalText(
            extracted.inspector_firm
          ),

        inspector_phone:
          optionalText(
            extracted.inspector_phone
          ),

        pressure,

        notes: optionalText(
          extracted.notes
        ),

        import_confidence: confidence,
        status,
        ocr_status: "complete",
      })
      .eq("id", permit.id)
      .eq("tenant_id", tenant.id);

    if (permitUpdateError) {
      throw new Error(
        `Unable to save extracted permit data: ${permitUpdateError.message}`
      );
    }

    if (
      boilerSerial &&
      permit.boiler_id
    ) {
      const {
        error: boilerUpdateError,
      } = await supabase
        .from("boilers")
        .update({
          serial_number: boilerSerial,
        })
        .eq("id", permit.boiler_id)
        .eq("tenant_id", tenant.id);

      if (boilerUpdateError) {
        throw new Error(
          `Permit was extracted, but the boiler serial could not be updated: ${boilerUpdateError.message}`
        );
      }
    }

    return NextResponse.json({
      success: true,

      extracted: {
        ...extracted,
        permit_number: permitNumber,
        issued_date: issuedDate,
        inspection_date: inspectionDate,
        expiration_date: expirationDate,
        boiler_serial: boilerSerial,
        pressure,
        confidence,
      },
    });
  } catch (error) {
    console.error(
      "Permit OCR error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "OCR failed.";

    await supabase
      .from("permits")
      .update({
        ocr_status: "failed",
      })
      .eq("id", permitId);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}