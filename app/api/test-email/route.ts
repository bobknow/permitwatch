import { NextResponse } from "next/server";

import { sendPermitExpirationEmail } from "@/lib/sendPermitExpirationEmail";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const email =
    new URL(request.url).searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Email address is required." },
      { status: 400 }
    );
  }

  try {
    const result =
      await sendPermitExpirationEmail({
        to: email,
        recipientName: "PermitWatch Test User",
        propertyName: "PermitWatch Test Property",
        propertyAddress:
          "123 Test Street, San Francisco, CA 94102",
        boilerNumber: "TEST-BOILER-01",
        permitNumber: "TEST-PERMIT-001",
        expirationDate: "2026-09-19",
        daysRemaining: 30,
      });

    return NextResponse.json({
      ok: true,
      message:
        "PermitWatch test email sent.",
      result,
    });
  } catch (error) {
    console.error(
      "PermitWatch test email failed:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Email test failed.",
      },
      { status: 500 }
    );
  }
}