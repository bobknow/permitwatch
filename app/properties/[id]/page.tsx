import Link from "next/link";
import { notFound } from "next/navigation";

import DeletePropertyButton from "@/components/properties/DeletePropertyButton";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type PropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PermitRecord = {
  id: string;
  boiler_id: string;
  expiration_date: string | null;
  ocr_status: string | null;
  created_at: string;
};

function getDaysRemaining(date: string | null) {
  if (!date) {
    return null;
  }

  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const expiration = new Date(
    `${date}T00:00:00`
  );

  return Math.ceil(
    (expiration.getTime() -
      todayStart.getTime()) /
    86_400_000
  );
}

function getCompliance(
  expirationDate: string | null
) {
  const daysRemaining =
    getDaysRemaining(expirationDate);

  if (daysRemaining === null) {
    return {
      label: "No Permit",
      classes:
        "bg-slate-100 text-slate-700",
    };
  }

  if (daysRemaining < 0) {
    return {
      label: "Expired",
      classes:
        "bg-red-50 text-red-700",
    };
  }

  if (daysRemaining <= 30) {
    return {
      label: "Due Soon",
      classes:
        "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Current",
    classes:
      "bg-emerald-50 text-emerald-700",
  };
}

export default async function PropertyPage({
  params,
}: PropertyPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    notFound();
  }

  const {
    data: property,
    error: propertyError,
  } = await supabase
    .from("properties")
    .select(`
      id,
      property_name,
      address_line_1,
      city,
      state,
      postal_code,
      notes
    `)
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  const {
    data: boilerData,
    error: boilersError,
  } = await supabase
    .from("boilers")
    .select(`
      id,
      boiler_number,
      model_number,
      serial_number,
      created_at
    `)
    .eq("property_id", property.id)
    .eq("tenant_id", profile.tenant_id);

  if (boilersError) {
    console.error(
      "Unable to load boilers:",
      boilersError
    );
  }

  const boilers = [
    ...(boilerData ?? []),
  ].sort(
    (a, b) =>
      Number(a.boiler_number) -
      Number(b.boiler_number)
  );

  const boilerIds = boilers.map(
    (boiler) => boiler.id
  );

  let permitRecords: PermitRecord[] = [];

  if (boilerIds.length > 0) {
    const {
      data: permits,
      error: permitsError,
    } = await supabase
      .from("permits")
      .select(`
        id,
        boiler_id,
        expiration_date,
        ocr_status,
        created_at
      `)
      .eq("tenant_id", profile.tenant_id)
      .in("boiler_id", boilerIds)
      .order("created_at", {
        ascending: false,
      });

    if (permitsError) {
      console.error(
        "Unable to load property permits:",
        permitsError
      );
    }

    permitRecords =
      (permits ?? []) as PermitRecord[];
  }

  /*
   * Use only the newest permit for each boiler.
   * Historical permits stay in the database but
   * do not distort compliance counts.
   */
  const latestPermitByBoiler =
    new Map<string, PermitRecord>();

  for (const permit of permitRecords) {
    if (
      !latestPermitByBoiler.has(
        permit.boiler_id
      )
    ) {
      latestPermitByBoiler.set(
        permit.boiler_id,
        permit
      );
    }
  }

  const activePermits = boilers.filter(
    (boiler) => {
      const permit =
        latestPermitByBoiler.get(
          boiler.id
        );

      const daysRemaining =
        getDaysRemaining(
          permit?.expiration_date ?? null
        );

      return (
        daysRemaining !== null &&
        daysRemaining > 30
      );
    }
  ).length;

  const dueSoon = boilers.filter(
    (boiler) => {
      const permit =
        latestPermitByBoiler.get(
          boiler.id
        );

      const daysRemaining =
        getDaysRemaining(
          permit?.expiration_date ?? null
        );

      return (
        daysRemaining !== null &&
        daysRemaining >= 0 &&
        daysRemaining <= 30
      );
    }
  ).length;

  const expired = boilers.filter(
    (boiler) => {
      const permit =
        latestPermitByBoiler.get(
          boiler.id
        );

      const daysRemaining =
        getDaysRemaining(
          permit?.expiration_date ?? null
        );

      return (
        daysRemaining !== null &&
        daysRemaining < 0
      );
    }
  ).length;

  const fullAddress = [
    property.address_line_1,
    property.city,
    property.state,
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/properties"
          className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
        >
          ← Back to Properties
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Property
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-900">
                {property.property_name}
              </h1>

              <p className="mt-2 text-slate-600">
                {fullAddress ||
                  "Address not provided"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/properties/${property.id}/boilers/new`}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Add Boiler
              </Link>

              <DeletePropertyButton
                propertyId={property.id}
                propertyName={
                  property.property_name
                }
              />
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Boilers"
              value={boilers.length}
            />

            <StatCard
              label="Active Permits"
              value={activePermits}
            />

            <StatCard
              label="Due Soon"
              value={dueSoon}
              tone="warning"
            />

            <StatCard
              label="Expired"
              value={expired}
              tone={
                expired > 0
                  ? "danger"
                  : "default"
              }
            />
          </div>
        </section>

        <section className="mt-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Boilers
            </h2>

            <p className="mt-1 text-slate-600">
              Boilers registered at this
              property.
            </p>
          </div>

          {boilers.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                No boilers added
              </h3>

              <p className="mt-2 text-slate-600">
                Add the first boiler for this
                property.
              </p>

              <Link
                href={`/properties/${property.id}/boilers/new`}
                className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Add Boiler
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {boilers.map((boiler) => {
                const permit =
                  latestPermitByBoiler.get(
                    boiler.id
                  );

                const compliance =
                  getCompliance(
                    permit?.expiration_date ??
                    null
                  );

                return (
                  <article
                    key={boiler.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Boiler
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-900">
                          Boiler #
                          {
                            boiler.boiler_number
                          }
                        </h3>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${compliance.classes}`}
                      >
                        {
                          compliance.label
                        }
                      </span>
                    </div>

                    <dl className="mt-6 space-y-4">
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
                          Serial Number
                        </dt>

                        <dd className="mt-1 font-semibold text-slate-900">
                          {boiler.serial_number ||
                            "Not provided"}
                        </dd>
                      </div>
                    </dl>

                    <Link
                      href={`/properties/${property.id}/boilers/${boiler.id}`}
                      className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      View Boiler →
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "danger";
}) {
  const valueClasses =
    tone === "danger"
      ? "text-red-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-slate-900";

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-3xl font-black ${valueClasses}`}
      >
        {value}
      </p>
    </div>
  );
}