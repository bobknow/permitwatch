import Link from "next/link";
import { redirect } from "next/navigation";

import PropertyForm from "@/components/properties/PropertyForm";
import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";

const propertyLimits = {
  starter: 25,
  growth: 100,
  professional: 500,
  enterprise: Infinity,
} as const;

type PlanName = keyof typeof propertyLimits;

function formatPlanName(plan: PlanName) {
  return (
    plan.charAt(0).toUpperCase() +
    plan.slice(1)
  );
}

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login?next=/properties/new");
  }

  const [tenantResult, propertiesResult] =
    await Promise.all([
      supabase
        .from("tenants")
        .select(`
          id,
          subscription_plan,
          subscription_status,
          is_active
        `)
        .eq("id", profile.tenant_id)
        .single(),

      supabase
        .from("properties")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("tenant_id", profile.tenant_id),
    ]);

  if (
    tenantResult.error ||
    !tenantResult.data
  ) {
    console.error(
      "Unable to load organization subscription:",
      tenantResult.error
    );

    redirect("/properties");
  }

  if (propertiesResult.error) {
    console.error(
      "Unable to count properties:",
      propertiesResult.error
    );

    redirect("/properties");
  }

  const tenant = tenantResult.data;

  if (!tenant.is_active) {
    redirect("/settings?error=organization_inactive");
  }

  const planName =
    tenant.subscription_plan &&
    tenant.subscription_plan in propertyLimits
      ? (tenant.subscription_plan as PlanName)
      : "starter";

  const propertyLimit = propertyLimits[planName];
  const propertyCount =
    propertiesResult.count ?? 0;

  const limitReached =
    Number.isFinite(propertyLimit) &&
    propertyCount >= propertyLimit;

  if (limitReached) {
    redirect(
      `/properties?error=property_limit&plan=${planName}&limit=${propertyLimit}`
    );
  }

  const remainingProperties =
    Number.isFinite(propertyLimit)
      ? propertyLimit - propertyCount
      : null;

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/properties"
          className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
        >
          ← Back to Properties
        </Link>

        <div className="mt-6">
          <h1 className="text-4xl font-black text-slate-900">
            Add Property
          </h1>

          <p className="mt-2 text-slate-600">
            Create a new property to begin tracking
            boilers and permits.
          </p>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                {formatPlanName(planName)} plan
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {propertyCount}{" "}
                {propertyCount === 1
                  ? "property"
                  : "properties"}{" "}
                currently managed
              </p>
            </div>

            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              {remainingProperties === null
                ? "Unlimited properties"
                : `${remainingProperties} remaining`}
            </span>
          </div>
        </section>

        <div className="mt-8">
          <PropertyForm />
        </div>
      </div>
    </main>
  );
}