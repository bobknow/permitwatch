import Link from "next/link";
import { redirect } from "next/navigation";

import PropertyCard from "@/components/properties/PropertyCard";
import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";

type PropertiesPageProps = {
  searchParams: Promise<{
    error?: string;
    plan?: string;
    limit?: string;
  }>;
};

function formatPlanName(plan: string | undefined) {
  if (!plan) {
    return "Current";
  }

  return (
    plan.charAt(0).toUpperCase() +
    plan.slice(1)
  );
}

export default async function PropertiesPage({
  searchParams,
}: PropertiesPageProps) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login?next=/properties");
  }

  const params = await searchParams;

  const propertyLimitReached =
    params.error === "property_limit";

  const planName = formatPlanName(params.plan);
  const propertyLimit = params.limit || "your";

  const { data: properties, error } =
    await supabase
      .from("properties")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Failed to load properties:",
      error
    );
  }

  const propertyList = properties ?? [];

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Properties
            </h1>

            <p className="mt-2 text-slate-600">
              Manage buildings, boilers, and permit
              compliance.
            </p>
          </div>

          <Link
            href="/properties/new"
            className="inline-flex w-fit items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Add Property
          </Link>
        </div>

        {propertyLimitReached && (
          <section className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
                  Property limit reached
                </p>

                <h2 className="mt-2 text-2xl font-black text-amber-950">
                  Your {planName} plan allows up to{" "}
                  {propertyLimit} properties.
                </h2>

                <p className="mt-2 max-w-2xl text-amber-800">
                  Upgrade your subscription to add
                  more properties and continue growing
                  your PermitWatch portfolio.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white transition hover:bg-amber-500"
                >
                  View Upgrade Options
                </Link>

                <Link
                  href="/api/billing/portal"
                  className="inline-flex items-center justify-center rounded-lg border border-amber-400 bg-white px-5 py-3 font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  Manage Billing
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900">
              Property List
            </h2>

            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">
              {propertyList.length}{" "}
              {propertyList.length === 1
                ? "Property"
                : "Properties"}
            </span>
          </div>

          {propertyList.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {propertyList.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                No properties yet
              </h3>

              <p className="mx-auto mt-3 max-w-md text-slate-600">
                Add your first property to begin
                tracking boilers and permit expiration
                dates.
              </p>

              <Link
                href="/properties/new"
                className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Add First Property
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}