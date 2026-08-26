import { NextResponse } from "next/server";

import { isSubscriptionActive } from "@/lib/billing";
import { createClient } from "@/lib/supabase/server";

type MatchRequest = {
    address_line_1?: unknown;
    city?: unknown;
    state?: unknown;
    postal_code?: unknown;
    boiler_number?: unknown;
    boiler_serial?: unknown;
};

function optionalText(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();

    return trimmed || null;
}

function normalizeAddress(value: string | null) {
    if (!value) {
        return "";
    }

    return value
        .toLowerCase()
        .trim()
        .replace(/\./g, "")
        .replace(/,/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\bstreet\b/g, "st")
        .replace(/\bavenue\b/g, "ave")
        .replace(/\bboulevard\b/g, "blvd")
        .replace(/\broad\b/g, "rd")
        .replace(/\bdrive\b/g, "dr")
        .replace(/\blane\b/g, "ln")
        .replace(/\bcourt\b/g, "ct")
        .replace(/\bplace\b/g, "pl")
        .replace(/\bparkway\b/g, "pkwy")
        .replace(/\bhighway\b/g, "hwy")
        .replace(/\bnorth\b/g, "n")
        .replace(/\bsouth\b/g, "s")
        .replace(/\beast\b/g, "e")
        .replace(/\bwest\b/g, "w")
        .trim();
}

function normalizeIdentifier(value: string | null) {
    if (!value) {
        return "";
    }

    return value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
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

        const body =
            (await request.json()) as MatchRequest;

        const addressLine1 = optionalText(
            body.address_line_1
        );

        const city = optionalText(body.city);

        const state =
            optionalText(body.state)?.toUpperCase() ??
            null;

        const postalCode = optionalText(
            body.postal_code
        );

        const boilerNumber = optionalText(
            body.boiler_number
        );

        const boilerSerial = optionalText(
            body.boiler_serial
        );

        if (!addressLine1) {
            return NextResponse.json(
                {
                    success: true,
                    propertyMatches: [],
                    boilerMatches: [],
                    message:
                        "Enter a property street address to search for matches.",
                },
                { status: 200 }
            );
        }

        const {
            data: properties,
            error: propertyError,
        } = await supabase
            .from("properties")
            .select(`
        id,
        property_name,
        address_line_1,
        address_line_2,
        city,
        state,
        postal_code,
        is_active
      `)
            .eq("tenant_id", tenant.id)
            .eq("is_active", true);

        if (propertyError) {
            throw new Error(
                `Unable to search properties: ${propertyError.message}`
            );
        }

        const normalizedInputAddress =
            normalizeAddress(addressLine1);

        const propertyMatches = (
            properties ?? []
        )
            .map((property) => {
                const normalizedStoredAddress =
                    normalizeAddress(
                        property.address_line_1
                    );

                let score = 0;

                if (
                    normalizedInputAddress ===
                    normalizedStoredAddress
                ) {
                    score += 100;
                } else if (
                    normalizedStoredAddress.includes(
                        normalizedInputAddress
                    ) ||
                    normalizedInputAddress.includes(
                        normalizedStoredAddress
                    )
                ) {
                    score += 70;
                }

                if (
                    city &&
                    property.city &&
                    city.toLowerCase() ===
                    property.city.toLowerCase()
                ) {
                    score += 10;
                }

                if (
                    state &&
                    property.state &&
                    state ===
                    property.state.toUpperCase()
                ) {
                    score += 10;
                }

                if (
                    postalCode &&
                    property.postal_code &&
                    postalCode ===
                    property.postal_code
                ) {
                    score += 10;
                }

                return {
                    ...property,
                    match_score: score,
                };
            })
            .filter(
                (property) =>
                    property.match_score >= 70
            )
            .sort(
                (a, b) =>
                    b.match_score -
                    a.match_score
            );

        const matchedPropertyIds =
            propertyMatches.map(
                (property) => property.id
            );

        let boilerMatches: {
            id: string;
            property_id: string;
            boiler_number: string | null;
            model_number: string | null;
            serial_number: string | null;
            match_score: number;
        }[] = [];

        if (matchedPropertyIds.length > 0) {
            const {
                data: boilers,
                error: boilerError,
            } = await supabase
                .from("boilers")
                .select(`
          id,
          property_id,
          boiler_number,
          model_number,
          serial_number
        `)
                .eq("tenant_id", tenant.id)
                .in(
                    "property_id",
                    matchedPropertyIds
                );

            if (boilerError) {
                throw new Error(
                    `Unable to search boilers: ${boilerError.message}`
                );
            }

            const normalizedBoilerNumber =
                normalizeIdentifier(
                    boilerNumber
                );

            const normalizedBoilerSerial =
                normalizeIdentifier(
                    boilerSerial
                );

            boilerMatches = (boilers ?? [])
                .map((boiler) => {
                    let score = 0;

                    if (
                        normalizedBoilerNumber &&
                        normalizeIdentifier(
                            boiler.boiler_number
                        ) === normalizedBoilerNumber
                    ) {
                        score += 100;
                    }

                    if (
                        normalizedBoilerSerial &&
                        normalizeIdentifier(
                            boiler.serial_number
                        ) === normalizedBoilerSerial
                    ) {
                        score += 100;
                    }

                    return {
                        ...boiler,
                        match_score: score,
                    };
                })
                .filter(
                    (boiler) =>
                        boiler.match_score > 0
                )
                .sort(
                    (a, b) =>
                        b.match_score -
                        a.match_score
                );
        }

        return NextResponse.json({
            success: true,

            propertyMatches,

            boilerMatches,

            suggestedProperty:
                propertyMatches[0] ?? null,

            suggestedBoiler:
                boilerMatches[0] ?? null,
        });
    } catch (error) {
        console.error(
            "Permit import match error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to search for existing records.",
            },
            { status: 500 }
        );
    }
}