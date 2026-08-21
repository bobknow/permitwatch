import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPermitExpirationEmail } from "@/lib/sendPermitExpirationEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reminderDays = new Set([
  30,
  14,
  7,
  3,
  1,
  0,
  -1,
  -7,
  -14,
  -30,
]);

type PermitRow = {
  id: string;
  tenant_id: string;
  permit_number: string | null;
  expiration_date: string | null;
  created_at: string;
  boiler:
    | {
        id: string;
        boiler_number: string | null;
        property:
          | {
              id: string;
              property_name: string | null;
              address_line_1: string | null;
              city: string | null;
              state: string | null;
              postal_code: string | null;
            }
          | {
              id: string;
              property_name: string | null;
              address_line_1: string | null;
              city: string | null;
              state: string | null;
              postal_code: string | null;
            }[]
          | null;
      }
    | {
        id: string;
        boiler_number: string | null;
        property:
          | {
              id: string;
              property_name: string | null;
              address_line_1: string | null;
              city: string | null;
              state: string | null;
              postal_code: string | null;
            }
          | {
              id: string;
              property_name: string | null;
              address_line_1: string | null;
              city: string | null;
              state: string | null;
              postal_code: string | null;
            }[]
          | null;
      }[]
    | null;
};

function daysUntil(date: string) {
  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const expiration = new Date(
    `${date}T00:00:00`
  );

  return Math.ceil(
    (expiration.getTime() - today.getTime()) /
      86_400_000
  );
}

function buildAddress(
  property:
    | {
        address_line_1: string | null;
        city: string | null;
        state: string | null;
        postal_code: string | null;
      }
    | null
) {
  if (!property) {
    return null;
  }

  return [
    property.address_line_1,
    property.city,
    property.state,
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function GET(request: Request) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "CRON_SECRET is not configured."
    );

    return NextResponse.json(
      {
        error:
          "Cron authentication is not configured.",
      },
      { status: 500 }
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (
    authorization !==
    `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    /*
     * Only tenants with usable subscription
     * access should receive automated reminders.
     */
    const {
      data: tenants,
      error: tenantError,
    } = await supabaseAdmin
      .from("tenants")
      .select(`
        id,
        subscription_status
      `)
      .in("subscription_status", [
        "active",
        "trialing",
      ]);

    if (tenantError) {
      throw new Error(
        `Unable to load tenants: ${tenantError.message}`
      );
    }

    if (!tenants?.length) {
      return NextResponse.json({
        ok: true,
        tenantsChecked: 0,
        permitsMatched: 0,
        emailsSent: 0,
        message:
          "No active PermitWatch tenants found.",
      });
    }

    let permitsMatched = 0;
    let emailsSent = 0;
    let failedEmails = 0;

    for (const tenant of tenants) {
      /*
       * Send compliance mail to active
       * administrators and managers.
       */
      const {
        data: recipients,
        error: recipientError,
      } = await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          is_active
        `)
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .in("role", [
          "admin",
          "manager",
        ]);

      if (recipientError) {
        console.error(
          `Unable to load recipients for tenant ${tenant.id}:`,
          recipientError
        );

        continue;
      }

      const emailRecipients =
        (recipients ?? []).filter(
          (
            recipient
          ): recipient is typeof recipient & {
            email: string;
          } =>
            Boolean(
              recipient.email?.trim()
            )
        );

      if (!emailRecipients.length) {
        continue;
      }

      /*
       * Load permit history newest-first.
       * We will only evaluate the newest
       * permit for each boiler.
       */
      const {
        data: permitData,
        error: permitError,
      } = await supabaseAdmin
        .from("permits")
        .select(`
          id,
          tenant_id,
          permit_number,
          expiration_date,
          created_at,
          boiler:boilers (
            id,
            boiler_number,
            property:properties (
              id,
              property_name,
              address_line_1,
              city,
              state,
              postal_code
            )
          )
        `)
        .eq("tenant_id", tenant.id)
        .not(
          "expiration_date",
          "is",
          null
        )
        .order("created_at", {
          ascending: false,
        });

      if (permitError) {
        console.error(
          `Unable to load permits for tenant ${tenant.id}:`,
          permitError
        );

        continue;
      }

      const permits =
        (permitData ?? []) as PermitRow[];

      const latestPermitByBoiler =
        new Map<string, PermitRow>();

      for (const permit of permits) {
        const boilerValue =
          permit.boiler;

        const boiler =
          Array.isArray(boilerValue)
            ? boilerValue[0] ?? null
            : boilerValue;

        if (!boiler) {
          continue;
        }

        if (
          !latestPermitByBoiler.has(
            boiler.id
          )
        ) {
          latestPermitByBoiler.set(
            boiler.id,
            permit
          );
        }
      }

      for (const permit of latestPermitByBoiler.values()) {
        if (!permit.expiration_date) {
          continue;
        }

        const remaining =
          daysUntil(
            permit.expiration_date
          );

        /*
         * Send only at defined milestones.
         * Because the cron runs daily, this
         * avoids sending the same alert every day.
         */
        if (
          !reminderDays.has(remaining)
        ) {
          continue;
        }

        permitsMatched += 1;

        const boilerValue =
          permit.boiler;

        const boiler =
          Array.isArray(boilerValue)
            ? boilerValue[0] ?? null
            : boilerValue;

        if (!boiler) {
          continue;
        }

        const propertyValue =
          boiler.property;

        const property =
          Array.isArray(propertyValue)
            ? propertyValue[0] ?? null
            : propertyValue;

        const propertyAddress =
          buildAddress(property);

        for (const recipient of emailRecipients) {
          try {
            await sendPermitExpirationEmail({
              to: recipient.email,
              recipientName:
                recipient.full_name,
              propertyName:
                property?.property_name ??
                null,
              propertyAddress,
              boilerNumber:
                boiler.boiler_number,
              permitNumber:
                permit.permit_number,
              expirationDate:
                permit.expiration_date,
              daysRemaining:
                remaining,
            });

            emailsSent += 1;
          } catch (error) {
            failedEmails += 1;

            console.error(
              `Permit reminder failed for permit ${permit.id} and recipient ${recipient.id}:`,
              error
            );
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      tenantsChecked:
        tenants.length,
      permitsMatched,
      emailsSent,
      failedEmails,
      reminderThresholds: [
        30,
        14,
        7,
        3,
        1,
        0,
        -1,
        -7,
        -14,
        -30,
      ],
    });
  } catch (error) {
    console.error(
      "Permit reminder cron failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Permit reminder job failed.",
      },
      { status: 500 }
    );
  }
}