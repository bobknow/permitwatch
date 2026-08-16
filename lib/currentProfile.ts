import { createClient } from "@/lib/supabase/server";
import { ensureTenantProfile } from "@/lib/ensureTenantProfile";

export async function getCurrentProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

  if (error) {
    console.error(
      "Unable to load current profile:",
      error
    );
    return null;
  }

  if (profile?.tenant_id) {
    return profile;
  }

  try {
    return await ensureTenantProfile(user);
  } catch (error) {
    console.error(
      "Unable to provision current PermitWatch profile:",
      error
    );
    return profile ?? null;
  }
}