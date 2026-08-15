import { supabaseAdmin } from "@/lib/supabase/admin";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    company_name?: string;
    company_type?: string;
  };
};

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

export async function ensureTenantProfile(
  user: AuthUser
) {
  const { data: existingProfile, error: profileLookupError } =
    await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

  if (profileLookupError) {
    throw profileLookupError;
  }

  if (existingProfile?.tenant_id) {
    return existingProfile;
  }

  const fullName =
    user.user_metadata?.full_name?.trim() ?? "";

  const companyName =
    user.user_metadata?.company_name?.trim() ?? "";

  const companyType =
    user.user_metadata?.company_type ?? "other";

  if (!fullName || !companyName) {
    throw new Error(
      "Missing signup metadata required to create organization."
    );
  }

  const { data: tenant, error: tenantError } =
    await supabaseAdmin
      .from("tenants")
      .insert({
        name: companyName,
        slug: createSlug(companyName),
        company_type: companyType,
        email: user.email ?? null,
        is_active: true,
      })
      .select()
      .single();

  if (tenantError || !tenant) {
    throw (
      tenantError ??
      new Error("Unable to create organization.")
    );
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: user.id,
        tenant_id: tenant.id,
        full_name: fullName,
        email: user.email ?? null,
        role: "admin",
        is_active: true,
      })
      .select()
      .single();

  if (profileError || !profile) {
    throw (
      profileError ??
      new Error("Unable to create user profile.")
    );
  }

  return profile;
}