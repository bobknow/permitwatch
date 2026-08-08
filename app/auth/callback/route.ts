import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function createSlug(companyName: string) {
  const baseSlug = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${baseSlug || "organization"}-${crypto
    .randomUUID()
    .slice(0, 8)}`;
}

function getSafeNextPath(next: string | null) {
  if (!next) {
    return "/dashboard";
  }

  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
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
      new URL("/login?error=missing_code", requestUrl.origin)
    );
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(exchangeError);

    return NextResponse.redirect(
      new URL("/login?error=invalid_link", requestUrl.origin)
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  //
  // Existing user
  //
  if (profile?.tenant_id) {
    return NextResponse.redirect(
      new URL(nextPath, requestUrl.origin)
    );
  }

  //
  // Brand new signup
  //

  const fullName =
    user.user_metadata?.full_name ?? "";

  const companyName =
    user.user_metadata?.company_name ?? "";

  const companyType =
    user.user_metadata?.company_type ?? "other";

  if (!fullName || !companyName) {
    return NextResponse.redirect(
      new URL("/signup", requestUrl.origin)
    );
  }

  const { data: tenant, error: tenantError } =
    await supabase
      .from("tenants")
      .insert({
        name: companyName,
        slug: createSlug(companyName),
        company_type: companyType,
        email: user.email,
        is_active: true,
      })
      .select()
      .single();

  if (tenantError || !tenant) {
    console.error(tenantError);

    return NextResponse.redirect(
      new URL("/signup", requestUrl.origin)
    );
  }

  const { error: profileError } =
    await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        tenant_id: tenant.id,
        full_name: fullName,
        email: user.email,
        role: "admin",
        is_active: true,
      });

  if (profileError) {
    console.error(profileError);

    return NextResponse.redirect(
      new URL("/signup", requestUrl.origin)
    );
  }

  return NextResponse.redirect(
    new URL("/onboarding", requestUrl.origin)
  );
}