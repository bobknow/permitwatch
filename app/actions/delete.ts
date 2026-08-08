"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function getAuthenticatedTenant() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

  if (profileError || !profile?.tenant_id) {
    throw new Error(
      "Your account is not connected to an organization."
    );
  }

  return {
    supabase,
    tenantId: profile.tenant_id,
  };
}

export async function deleteBoiler(
  boilerId: string
) {
  const { supabase, tenantId } =
    await getAuthenticatedTenant();

  const { data: boiler, error: boilerError } =
    await supabase
      .from("boilers")
      .select("id, property_id")
      .eq("id", boilerId)
      .eq("tenant_id", tenantId)
      .single();

  if (boilerError || !boiler) {
    throw new Error("Boiler not found.");
  }

  /*
   * Don't delete permits yet.
   *
   * We want to verify the database foreign-key behavior
   * before allowing a boiler with permit history to be
   * permanently removed.
   */
  const { count: permitCount, error: permitError } =
    await supabase
      .from("permits")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("boiler_id", boiler.id)
      .eq("tenant_id", tenantId);

  if (permitError) {
    throw new Error(
      "Unable to verify boiler permit history."
    );
  }

  if ((permitCount ?? 0) > 0) {
    throw new Error(
      "This boiler has permit history and cannot be deleted yet."
    );
  }

  const { error: deleteError } =
    await supabase
      .from("boilers")
      .delete()
      .eq("id", boiler.id)
      .eq("tenant_id", tenantId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/boilers");
  revalidatePath("/properties");
  revalidatePath(
    `/properties/${boiler.property_id}`
  );

  redirect(
    `/properties/${boiler.property_id}`
  );
}

export async function deleteProperty(
  propertyId: string
) {
  const { supabase, tenantId } =
    await getAuthenticatedTenant();

  const { data: property, error: propertyError } =
    await supabase
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("tenant_id", tenantId)
      .single();

  if (propertyError || !property) {
    throw new Error("Property not found.");
  }

  /*
   * Prevent accidental cascading deletion.
   * Boilers must be removed individually first.
   */
  const { count: boilerCount, error: boilerError } =
    await supabase
      .from("boilers")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("property_id", property.id)
      .eq("tenant_id", tenantId);

  if (boilerError) {
    throw new Error(
      "Unable to verify property boilers."
    );
  }

  if ((boilerCount ?? 0) > 0) {
    throw new Error(
      "Remove this property's boilers before deleting the property."
    );
  }

  const { error: deleteError } =
    await supabase
      .from("properties")
      .delete()
      .eq("id", property.id)
      .eq("tenant_id", tenantId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/properties");
  revalidatePath("/dashboard");

  redirect("/properties");
}