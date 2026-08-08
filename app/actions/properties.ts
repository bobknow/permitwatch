"use server";

import { redirect } from "next/navigation";

import {
  getPropertyLimit,
  requireActiveSubscription,
} from "@/lib/billing";

function getTextValue(
  formData: FormData,
  field: string
) {
  const value = formData.get(field);

  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function createProperty(
  formData: FormData
) {
  const {
    supabase,
    tenant,
    planName,
  } = await requireActiveSubscription(
    "/properties/new"
  );

  const propertyLimit =
    getPropertyLimit(planName);

  const {
    count: propertyCount,
    error: countError,
  } = await supabase
    .from("properties")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("tenant_id", tenant.id);

  if (countError) {
    console.error(
      "Unable to count properties:",
      countError
    );

    throw new Error(
      "Unable to verify your property allowance."
    );
  }

  const currentPropertyCount =
    propertyCount ?? 0;

  if (
    Number.isFinite(propertyLimit) &&
    currentPropertyCount >= propertyLimit
  ) {
    redirect(
      `/properties?error=property_limit&plan=${planName}&limit=${propertyLimit}`
    );
  }

  const propertyName = getTextValue(
    formData,
    "property_name"
  );

  const addressLine1 = getTextValue(
    formData,
    "address_line_1"
  );

  const city = getTextValue(
    formData,
    "city"
  );

  const state = getTextValue(
    formData,
    "state"
  );

  const postalCode = getTextValue(
    formData,
    "postal_code"
  );

  if (!propertyName) {
    throw new Error(
      "Property name is required."
    );
  }

  const { error: insertError } =
    await supabase
      .from("properties")
      .insert({
        tenant_id: tenant.id,
        property_name: propertyName,
        address_line_1:
          addressLine1 || null,
        city: city || null,
        state: state || null,
        postal_code:
          postalCode || null,
      });

  if (insertError) {
    console.error(
      "Unable to create property:",
      insertError
    );

    throw new Error(
      insertError.message
    );
  }

  redirect("/properties");
}