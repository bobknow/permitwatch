import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const propertyLimits = {
  starter: 25,
  growth: 100,
  professional: 500,
  enterprise: Infinity,
} as const;

export type PlanName = keyof typeof propertyLimits;

const allowedSubscriptionStatuses = new Set([
  "active",
  "trialing",
]);

export function isSubscriptionActive(
  status: string | null | undefined
) {
  return Boolean(
    status &&
      allowedSubscriptionStatuses.has(status)
  );
}

export function getPlanName(
  value: string | null | undefined
): PlanName {
  if (value && value in propertyLimits) {
    return value as PlanName;
  }

  return "starter";
}

export function getPropertyLimit(
  plan: string | null | undefined
) {
  return propertyLimits[getPlanName(plan)];
}

export async function requireActiveSubscription(
  returnPath = "/dashboard"
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      `/login?next=${encodeURIComponent(returnPath)}`
    );
  }

  const { data: profile, error: profileError } =
    await supabase
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
    redirect("/login");
  }

  const { data: tenant, error: tenantError } =
    await supabase
      .from("tenants")
      .select(`
        id,
        is_active,
        subscription_plan,
        subscription_status,
        subscription_ends_at,
        stripe_customer_id
      `)
      .eq("id", profile.tenant_id)
      .single();

  if (tenantError || !tenant) {
    throw new Error(
      "Unable to load your organization subscription."
    );
  }

  if (!tenant.is_active) {
    redirect(
      `/settings?error=organization_inactive`
    );
  }

  if (
    !isSubscriptionActive(
      tenant.subscription_status
    )
  ) {
    const billingUrl = new URLSearchParams({
      error: "subscription_required",
      status:
        tenant.subscription_status || "none",
      next: returnPath,
    });

    redirect(`/settings?${billingUrl.toString()}`);
  }

  return {
    supabase,
    user,
    profile,
    tenant,
    planName: getPlanName(
      tenant.subscription_plan
    ),
  };
}