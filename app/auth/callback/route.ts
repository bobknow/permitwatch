import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ensureTenantProfile } from "@/lib/ensureTenantProfile";

function getSafeNextPath(next: string | null) {
  if (!next) {
    return "/onboarding";
  }

  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/onboarding";
  }

  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  const nextPath = getSafeNextPath(
    requestUrl.searchParams.get("next")
  );

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=missing_code",
        requestUrl.origin
      )
    );
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(exchangeError);

    return NextResponse.redirect(
      new URL(
        "/login?error=invalid_link",
        requestUrl.origin
      )
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login", requestUrl.origin)
    );
  }

  try {
    await ensureTenantProfile(user);
  } catch (error) {
    console.error(
      "Unable to provision PermitWatch account:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/signup?error=provisioning_failed",
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(
    new URL(nextPath, requestUrl.origin)
  );
}