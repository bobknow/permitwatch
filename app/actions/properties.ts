"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createProperty(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    throw new Error("User is not assigned to a tenant.");
  }

  const { error } = await supabase
    .from("properties")
    .insert({
      tenant_id: profile.tenant_id,
      property_name: formData.get("property_name"),
      address_line_1: formData.get("address_line_1"),
      city: formData.get("city"),
      state: formData.get("state"),
      postal_code: formData.get("postal_code"),
    });

  if (error) {
    console.error(error);
    throw new Error(error.message);
  }

  redirect("/properties");
}