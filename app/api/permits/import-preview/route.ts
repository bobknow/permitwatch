import OpenAI from "openai";
import { NextResponse } from "next/server";

import { isSubscriptionActive } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
] as const;

const maxFileSize = 25 * 1024 * 1024;

type ExtractedImport = {
    permit_number: string | null;
    issued_date: string | null;
    inspection_date: string | null;
    expiration_date: string | null;

    property_name: string | null;
    address_line_1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;

    boiler_number: string | null;
    boiler_serial: string | null;
    boiler_model: string | null;
    boiler_manufacturer: string | null;
    boiler_type: string | null;

    pressure: number | string | null;

    inspector_name: string | null;
    inspector_firm: string | null;
    inspector_phone: string | null;

    notes: string | null;
    confidence: number | null;
};

function cleanJson(outputText: string) {
    return outputText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
}

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

export async function POST(request: Request) {
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
                        "An active subscription is required to import permits.",
                    code: "subscription_required",
                },
                { status: 402 }
            );
        }

        const formData = await request.formData();

        const fileValue = formData.get("file");

        if (!(fileValue instanceof File)) {
            return NextResponse.json(
                {
                    error: "Permit file is required.",
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

        if (
            !allowedTypes.includes(
                fileValue.type as
                (typeof allowedTypes)[number]
            )
        ) {
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

        const fileBuffer = Buffer.from(
            await fileValue.arrayBuffer()
        );

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
Read this boiler Permit to Operate document carefully.

Your job is to extract structured information about the PERMITTED PROPERTY,
the BOILER, and the PERMIT.

Read the entire document before returning results.

IMPORTANT ADDRESS RULES:

1. The property address means the physical installation/site address
   where the permitted boiler is located.

2. Look for labels and nearby text such as:
   "Installation Address",
   "Site Address",
   "Property Address",
   "Location",
   "Address",
   "Premises",
   or equivalent wording.

3. Separate the property address into:
   - address_line_1
   - city
   - state
   - postal_code

4. The city, state, and ZIP may appear:
   - on the same line as the street address,
   - on the next line,
   - elsewhere in the same address block,
   - or in nearby text belonging to the same property.

5. Do NOT use an address belonging to:
   - the inspector,
   - inspection company,
   - contractor,
   - issuing agency,
   - mailing address,
   - website,
   - or any other business/person
   as the property address.

6. If a street address is clearly identified as the permitted property,
   preserve it even if city/state/ZIP cannot be found.

PROPERTY NAME:

Use property_name only when the document clearly prints a building,
property, project, complex, or facility name.

Do not invent a property name from the street address.

BOILER RULES:

Look throughout the entire document for boiler/equipment identifiers.

boiler_number means the identifying boiler or equipment number used for
that specific boiler at the property.

Look for labels such as:
- Boiler No.
- Boiler Number
- Unit No.
- Unit Number
- Equipment No.
- Equipment Number
- Vessel No.
- State No.
- Device No.

Do not confuse boiler_number with:
- permit_number,
- serial number,
- model number,
- pressure,
- inspection number,
- or certificate number.

boiler_serial means the manufacturer's serial number.

boiler_model means the manufacturer's model number.

boiler_manufacturer means the equipment manufacturer only when clearly shown.

boiler_type means the boiler/equipment type only when clearly shown.

PERMIT RULES:

permit_number means the permit, certificate, PTO, or operating permit number.

issued_date means the permit issue date.

inspection_date means the inspection date.

expiration_date means the permit expiration date.

Do not substitute one date for another unless the document clearly labels it.

INSPECTOR RULES:

Extract inspector_name, inspector_firm, and inspector_phone only from
information clearly associated with the inspector or inspecting company.

If an inspector/company address appears, do NOT use it as the property address.

GENERAL RULES:

Extract only information clearly supported by the document.

Do not guess missing information.

You may connect text that is clearly part of the same labeled field or
address block even when it wraps across multiple lines.

Use null when a value cannot be reliably identified.

Format dates as YYYY-MM-DD.

Return state as the two-letter abbreviation when clearly identifiable.

Return pressure as a number only, without units.

Confidence must represent confidence in the overall extraction and must be
a number from 0 through 1.

Return ONLY valid JSON.
Do not include Markdown.
Do not include comments.
Do not include explanation.

Use exactly this JSON structure:

{
  "permit_number": null,
  "issued_date": null,
  "inspection_date": null,
  "expiration_date": null,

  "property_name": null,
  "address_line_1": null,
  "city": null,
  "state": null,
  "postal_code": null,

  "boiler_number": null,
  "boiler_serial": null,
  "boiler_model": null,
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
                                    fileValue.name ||
                                    "permit.pdf",

                                file_data:
                                    `data:${fileValue.type};base64,` +
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

        const extracted = JSON.parse(
            cleanJson(response.output_text)
        ) as ExtractedImport;

        const result = {
            permit_number: optionalText(
                extracted.permit_number
            ),

            issued_date: optionalText(
                extracted.issued_date
            ),

            inspection_date: optionalText(
                extracted.inspection_date
            ),

            expiration_date: optionalText(
                extracted.expiration_date
            ),

            property_name: optionalText(
                extracted.property_name
            ),

            address_line_1: optionalText(
                extracted.address_line_1
            ),

            city: optionalText(
                extracted.city
            ),

            state:
                optionalText(extracted.state)
                    ?.toUpperCase() ?? null,

            postal_code: optionalText(
                extracted.postal_code
            ),

            boiler_number: optionalText(
                extracted.boiler_number
            ),

            boiler_serial: optionalText(
                extracted.boiler_serial
            ),

            boiler_model: optionalText(
                extracted.boiler_model
            ),

            boiler_manufacturer: optionalText(
                extracted.boiler_manufacturer
            ),

            boiler_type: optionalText(
                extracted.boiler_type
            ),

            pressure: normalizePressure(
                extracted.pressure
            ),

            inspector_name: optionalText(
                extracted.inspector_name
            ),

            inspector_firm: optionalText(
                extracted.inspector_firm
            ),

            inspector_phone: optionalText(
                extracted.inspector_phone
            ),

            notes: optionalText(
                extracted.notes
            ),

            confidence: normalizeConfidence(
                extracted.confidence
            ),
        };

        return NextResponse.json({
            success: true,
            file: {
                name: fileValue.name,
                type: fileValue.type,
                size: fileValue.size,
            },
            extracted: result,
        });
    } catch (error) {
        console.error(
            "Permit import preview error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to read permit.",
            },
            { status: 500 }
        );
    }
}