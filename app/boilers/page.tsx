import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";

type PermitRecord = {
  boiler_id: string;
  expiration_date: string | null;
  created_at: string;
};

function formatDate(date: string | null) {
  if (!date) {
    return "Not available";
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getCompliance(expirationDate: string | null) {
  if (!expirationDate) {
    return {
      label: "No Permit",
      classes: "bg-slate-100 text-slate-700",
      message: "Permit required",
    };
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const expiration = new Date(
    `${expirationDate}T00:00:00`
  );

  const daysRemaining = Math.ceil(
    (expiration.getTime() - todayStart.getTime()) /
    (1000 * 60 * 60 * 24)
  );

  if (daysRemaining < 0) {
    const daysOverdue = Math.abs(daysRemaining);

    return {
      label: "Expired",
      classes: "bg-red-50 text-red-700",
      message: `${daysOverdue} ${daysOverdue === 1 ? "day" : "days"
        } overdue`,
    };
  }

  if (daysRemaining <= 30) {
    return {
      label: "Expiring Soon",
      classes: "bg-amber-50 text-amber-700",
      message: `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"
        } remaining`,
    };
  }

  return {
    label: "Current",
    classes: "bg-emerald-50 text-emerald-700",
    message: `${daysRemaining} days remaining`,
  };
}

export default async function BoilersPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login?next=/boilers");
  }

  const { data: boilerData, error: boilersError } =
    await supabase
      .from("boilers")
      .select(`
        id,
        property_id,
        boiler_number,
        model_number,
        serial_number,
        created_at,
        properties (
          id,
          property_name,
          address_line_1,
          city,
          state,
          postal_code
        )
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

  if (boilersError) {
    console.error("Unable to load boilers:", boilersError);
  }

  const boilers = boilerData ?? [];
  const boilerIds = boilers.map((boiler) => boiler.id);

  let permitRecords: PermitRecord[] = [];

  if (boilerIds.length > 0) {
    const { data: permits, error: permitsError } =
      await supabase
        .from("permits")
        .select(`
          boiler_id,
          expiration_date,
          created_at
        `)
        .eq("tenant_id", profile.tenant_id)
        .in("boiler_id", boilerIds)
        .order("created_at", { ascending: false });

    if (permitsError) {
      console.error(
        "Unable to load boiler permits:",
        permitsError
      );
    }

    permitRecords = permits ?? [];
  }

  const latestPermitByBoiler = new Map<
    string,
    PermitRecord
  >();

  for (const permit of permitRecords) {
    if (!latestPermitByBoiler.has(permit.boiler_id)) {
      latestPermitByBoiler.set(
        permit.boiler_id,
        permit
      );
    }
  }

  const currentCount = boilers.filter((boiler) => {
    const permit = latestPermitByBoiler.get(boiler.id);

    return (
      getCompliance(permit?.expiration_date ?? null)
        .label === "Current"
    );
  }).length;

  const attentionCount = boilers.length - currentCount;

  return (
    <main className="p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Boilers
            </h1>

            <p className="mt-2 text-slate-600">
              View boiler equipment and permit compliance
              across all properties.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex w-fit items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Select Property to Add Boiler
          </Link>
        </div>

        <section className="mt-8 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Total Boilers
            </p>

            <p className="mt-3 text-4xl font-black text-slate-900">
              {boilers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Current
            </p>

            <p className="mt-3 text-4xl font-black text-emerald-700">
              {currentCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Attention Needed
            </p>

            <p className="mt-3 text-4xl font-black text-amber-700">
              {attentionCount}
            </p>
          </div>
        </section>

        {boilers.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              No boilers yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Open a property and add its first boiler.
            </p>

            <Link
              href="/properties"
              className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              View Properties
            </Link>
          </section>
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {boilers.map((boiler) => {
              const propertyValue = boiler.properties;

              const property = Array.isArray(propertyValue)
                ? propertyValue[0]
                : propertyValue;

              const permit = latestPermitByBoiler.get(
                boiler.id
              );

              const compliance = getCompliance(
                permit?.expiration_date ?? null
              );

              const propertyAddress = property
                ? [
                  property.address_line_1,
                  property.city,
                  property.state,
                  property.postal_code,
                ]
                  .filter(Boolean)
                  .join(", ")
                : "Property information unavailable";

              return (
                <article
                  key={boiler.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        {property?.property_name ??
                          "Property"}
                      </p>

                      <h2 className="mt-2 text-2xl font-black text-slate-900">
                        Boiler #{boiler.boiler_number}
                      </h2>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${compliance.classes}`}
                    >
                      {compliance.label}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    {propertyAddress}
                  </p>

                  <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Serial Number
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-900">
                        {boiler.serial_number ||
                          "Not provided"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Model Number
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-900">
                        {boiler.model_number ||
                          "Not provided"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Permit Expiration
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-900">
                        {formatDate(
                          permit?.expiration_date ?? null
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Compliance
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-900">
                        {compliance.message}
                      </dd>
                    </div>
                  </dl>

                  {property && (
                    <Link
                      href={`/properties/${property.id}/boilers/${boiler.id}`}
                      className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-700"
                    >
                      View Boiler →
                    </Link>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}