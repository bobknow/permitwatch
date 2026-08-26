import { NextResponse } from "next/server";

import {
    getPlanName,
    getPropertyLimit,
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

type ExtractedImport = {
    permit_number?: string | null;
    issued_date?: string | null;
    inspection_date?: string | null;
    expiration_date?: string | null;

    property_name?: string | null;
    address_line_1?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;

    boiler_number?: string | null;
    boiler_serial?: string | null;
    boiler_model?: string | null;
    boiler_manufacturer?: string | null;
    boiler_type?: string | null;

    pressure?: number | null;

    inspector_name?: string | null;
    inspector_firm?: string | null;
    inspector_phone?: string | null;

    notes?: string | null;
    confidence?: number | null;
};

function optionalText(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();

    return trimmed || null;
}

function sanitizeFileName(fileName: string) {
    return fileName
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
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

export async function POST(request: Request) {
    let uploadedStoragePath: string | null = null;

    let createdPropertyId: string | null = null;
    let createdBoilerId: string | null = null;

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
        subscription_status,
        subscription_plan
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

        const extractedValue =
            formData.get("extracted");

        const selectedPropertyId =
            optionalText(
                formData.get(
                    "selected_property_id"
                )
            );

        const selectedBoilerId =
            optionalText(
                formData.get(
                    "selected_boiler_id"
                )
            );

        if (!(fileValue instanceof File)) {
            return NextResponse.json(
                {
                    error: "Permit file is required.",
                },
                { status: 400 }
            );
        }

        if (
            typeof extractedValue !== "string"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Extracted permit information is required.",
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

        let extracted: ExtractedImport;

        try {
            extracted = JSON.parse(
                extractedValue
            ) as ExtractedImport;
        } catch {
            return NextResponse.json(
                {
                    error:
                        "Permit information could not be read.",
                },
                { status: 400 }
            );
        }

        const addressLine1 =
            optionalText(
                extracted.address_line_1
            );

        const city =
            optionalText(extracted.city);

        const state =
            optionalText(extracted.state)
                ?.toUpperCase() ?? null;

        const postalCode =
            optionalText(
                extracted.postal_code
            );

        const propertyName =
            optionalText(
                extracted.property_name
            );

        const boilerNumber =
            optionalText(
                extracted.boiler_number
            );

        const boilerSerial =
            optionalText(
                extracted.boiler_serial
            );

        const boilerModel =
            optionalText(
                extracted.boiler_model
            );

        let propertyId =
            selectedPropertyId;

        /*
         * EXISTING PROPERTY
         */
        if (propertyId) {
            const {
                data: property,
                error: propertyError,
            } = await supabase
                .from("properties")
                .select("id")
                .eq("id", propertyId)
                .eq("tenant_id", tenant.id)
                .eq("is_active", true)
                .single();

            if (
                propertyError ||
                !property
            ) {
                return NextResponse.json(
                    {
                        error:
                            "Selected property was not found.",
                    },
                    { status: 404 }
                );
            }
        }

        /*
         * NEW PROPERTY
         */
        if (!propertyId) {
            if (
                !addressLine1 ||
                !city ||
                !state ||
                !postalCode
            ) {
                return NextResponse.json(
                    {
                        error:
                            "Street address, city, state, and ZIP are required to create a new property.",
                    },
                    { status: 400 }
                );
            }

            const planName =
                getPlanName(
                    tenant.subscription_plan
                );

            const propertyLimit =
                getPropertyLimit(planName);

            const {
                count,
                error: countError,
            } = await supabase
                .from("properties")
                .select("id", {
                    count: "exact",
                    head: true,
                })
                .eq("tenant_id", tenant.id);

            if (countError) {
                throw new Error(
                    "Unable to verify your property allowance."
                );
            }

            if (
                Number.isFinite(
                    propertyLimit
                ) &&
                (count ?? 0) >=
                propertyLimit
            ) {
                return NextResponse.json(
                    {
                        error:
                            `Your ${planName} plan allows up to ${propertyLimit} properties.`,
                        code: "property_limit",
                    },
                    { status: 403 }
                );
            }

            const {
                data: property,
                error: propertyError,
            } = await supabase
                .from("properties")
                .insert({
                    tenant_id: tenant.id,

                    /*
                     * If the document has no formal
                     * property name, use the street
                     * address as the display name.
                     */
                    property_name:
                        propertyName ||
                        addressLine1,

                    address_line_1:
                        addressLine1,

                    city,
                    state,

                    postal_code:
                        postalCode,

                    is_active: true,

                    created_by:
                        user.id,
                })
                .select("id")
                .single();

            if (
                propertyError ||
                !property
            ) {
                throw new Error(
                    propertyError?.message ??
                    "Unable to create property."
                );
            }

            propertyId =
                property.id;

            createdPropertyId =
                property.id;
        }

        /*
         * EXISTING BOILER
         */
        let boilerId =
            selectedBoilerId;

        if (boilerId) {
            const {
                data: boiler,
                error: boilerError,
            } = await supabase
                .from("boilers")
                .select(`
          id,
          property_id
        `)
                .eq("id", boilerId)
                .eq(
                    "property_id",
                    propertyId
                )
                .eq(
                    "tenant_id",
                    tenant.id
                )
                .single();

            if (
                boilerError ||
                !boiler
            ) {
                return NextResponse.json(
                    {
                        error:
                            "Selected boiler was not found at this property.",
                    },
                    { status: 404 }
                );
            }
        }

        /*
         * NEW BOILER
         */
        if (!boilerId) {
            if (!boilerNumber) {
                return NextResponse.json(
                    {
                        error:
                            "Enter a boiler number before creating a new boiler.",
                    },
                    { status: 400 }
                );
            }

            const {
                data: existingBoiler,
                error:
                existingBoilerError,
            } = await supabase
                .from("boilers")
                .select("id")
                .eq(
                    "property_id",
                    propertyId
                )
                .eq(
                    "boiler_number",
                    boilerNumber
                )
                .eq(
                    "tenant_id",
                    tenant.id
                )
                .maybeSingle();

            if (existingBoilerError) {
                throw new Error(
                    "Unable to verify the boiler number."
                );
            }

            if (existingBoiler) {
                boilerId =
                    existingBoiler.id;
            } else {
                const {
                    data: boiler,
                    error: boilerError,
                } = await supabase
                    .from("boilers")
                    .insert({
                        tenant_id:
                            tenant.id,

                        property_id:
                            propertyId,

                        boiler_number:
                            boilerNumber,

                        model_number:
                            boilerModel,

                        serial_number:
                            boilerSerial,

                        created_by:
                            profile.id,
                    })
                    .select("id")
                    .single();

                if (
                    boilerError ||
                    !boiler
                ) {
                    throw new Error(
                        boilerError?.message ??
                        "Unable to create boiler."
                    );
                }

                boilerId =
                    boiler.id;

                createdBoilerId =
                    boiler.id;
            }
        }

        /*
         * STORE ORIGINAL DOCUMENT
         */
        const extension =
            extensionsByType[
            fileValue.type
            ];

        const originalBaseName =
            fileValue.name.replace(
                /\.[^/.]+$/,
                ""
            );

        const safeName =
            sanitizeFileName(
                originalBaseName
            ) || "permit";

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

        const {
            error: uploadError,
        } = await supabase.storage
            .from("permit-documents")
            .upload(
                uploadedStoragePath,
                fileBuffer,
                {
                    contentType:
                        fileValue.type,
                    upsert: false,
                }
            );

        if (uploadError) {
            throw new Error(
                uploadError.message
            );
        }

        /*
         * ARCHIVE PREVIOUS ACTIVE
         * PERMIT RECORDS
         */
        const {
            data: previousPermits,
            error:
            previousPermitError,
        } = await supabase
            .from("permits")
            .select(`
        id,
        status
      `)
            .eq(
                "boiler_id",
                boilerId
            )
            .eq(
                "tenant_id",
                tenant.id
            )
            .neq(
                "status",
                "inactive"
            );

        if (previousPermitError) {
            throw new Error(
                "Unable to load existing permit history."
            );
        }

        const previousPermitIds =
            (
                previousPermits ?? []
            ).map(
                (permit) =>
                    permit.id
            );

        if (
            previousPermitIds.length >
            0
        ) {
            const {
                error: archiveError,
            } = await supabase
                .from("permits")
                .update({
                    status: "inactive",
                })
                .in(
                    "id",
                    previousPermitIds
                )
                .eq(
                    "tenant_id",
                    tenant.id
                );

            if (archiveError) {
                throw new Error(
                    "Unable to archive the previous permit."
                );
            }
        }

        const expirationDate =
            optionalText(
                extracted.expiration_date
            );

        const permitStatus =
            calculatePermitStatus(
                expirationDate
            );

        /*
         * CREATE COMPLETED PERMIT
         * WITHOUT RUNNING OCR AGAIN
         */
        const {
            data: permit,
            error: permitError,
        } = await supabase
            .from("permits")
            .insert({
                tenant_id:
                    tenant.id,

                boiler_id:
                    boilerId,

                permit_number:
                    optionalText(
                        extracted.permit_number
                    ),

                issued_date:
                    optionalText(
                        extracted.issued_date
                    ),

                inspection_date:
                    optionalText(
                        extracted.inspection_date
                    ),

                expiration_date:
                    expirationDate,

                installation_address:
                    addressLine1,

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

                pressure:
                    typeof extracted.pressure ===
                        "number"
                        ? extracted.pressure
                        : null,

                notes:
                    optionalText(
                        extracted.notes
                    ),

                import_confidence:
                    typeof extracted.confidence ===
                        "number"
                        ? extracted.confidence
                        : null,

                status:
                    permitStatus,

                storage_path:
                    uploadedStoragePath,

                source_filename:
                    fileValue.name,

                ocr_status:
                    "complete",

                created_by:
                    profile.id,
            })
            .select(`
        id,
        tenant_id,
        boiler_id,
        permit_number,
        expiration_date,
        status,
        ocr_status,
        created_at
      `)
            .single();

        if (
            permitError ||
            !permit
        ) {
            /*
             * Restore previous permit
             * statuses if this insert fails.
             */
            for (
                const previousPermit of
                previousPermits ?? []
            ) {
                await supabase
                    .from("permits")
                    .update({
                        status:
                            previousPermit.status,
                    })
                    .eq(
                        "id",
                        previousPermit.id
                    )
                    .eq(
                        "tenant_id",
                        tenant.id
                    );
            }

            throw new Error(
                permitError?.message ??
                "Unable to create permit."
            );
        }

        return NextResponse.json(
            {
                success: true,

                created: {
                    property:
                        Boolean(
                            createdPropertyId
                        ),

                    boiler:
                        Boolean(
                            createdBoilerId
                        ),
                },

                property_id:
                    propertyId,

                boiler_id:
                    boilerId,

                permit,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error(
            "Permit import save error:",
            error
        );

        try {
            const supabase =
                await createClient();

            if (
                uploadedStoragePath
            ) {
                await supabase.storage
                    .from(
                        "permit-documents"
                    )
                    .remove([
                        uploadedStoragePath,
                    ]);
            }

            /*
             * Clean up records that were
             * created by this failed import.
             */
            if (createdBoilerId) {
                await supabase
                    .from("boilers")
                    .delete()
                    .eq(
                        "id",
                        createdBoilerId
                    );
            }

            if (createdPropertyId) {
                await supabase
                    .from("properties")
                    .delete()
                    .eq(
                        "id",
                        createdPropertyId
                    );
            }
        } catch (cleanupError) {
            console.error(
                "Permit import cleanup error:",
                cleanupError
            );
        }

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to save permit import.",
            },
            { status: 500 }
        );
    }
}