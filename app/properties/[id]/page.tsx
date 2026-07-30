import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type PropertyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PropertyPage({
  params,
}: PropertyPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    notFound();
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select(
      `
      id,
      property_name,
      address_line_1,
      city,
      state,
      postal_code,
      notes
      `
    )
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  const { data: boilerData, error: boilersError } = await supabase
    .from("boilers")
    .select(
      `
      id,
      boiler_number,
      model_number,
      serial_number,
      created_at
      `
    )
    .eq("property_id", property.id)
    .eq("tenant_id", profile.tenant_id);

  if (boilersError) {
    console.error("Unable to load boilers:", boilersError);
  }

  const boilers = [...(boilerData ?? [])].sort(
    (a, b) =>
      Number(a.boiler_number) - Number(b.boiler_number)
  );

  const fullAddress = [
    property.address_line_1,
    property.city,
    property.state,
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/properties"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
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
                {fullAddress}
              </p>
            </div>

            <Link
              href={`/properties/${property.id}/boilers/new`}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Add Boiler
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Total Boilers
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                {boilers.length}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Active Permits
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                0
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Due Soon
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                0
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Expired
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                0
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Boilers
              </h2>

              <p className="mt-1 text-slate-600">
                Boilers registered at this property.
              </p>
            </div>
          </div>

          {boilers.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h3 className="text-lg font-bold text-slate-900">
                No boilers added
              </h3>

              <p className="mt-2 text-slate-600">
                Add the first boiler for this property.
              </p>

              <Link
                href={`/properties/${property.id}/boilers/new`}
                className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
              >
                Add Boiler
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {boilers.map((boiler) => (
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
                        Boiler #{boiler.boiler_number}
                      </h3>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      No Permit
                    </span>
                  </div>

                  <dl className="mt-6 space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Model Number
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-900">
                        {boiler.model_number || "Not provided"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-slate-500">
                        Serial Number
                      </dt>

                      <dd className="mt-1 font-semibold text-slate-900">
                        {boiler.serial_number || "Not provided"}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/properties/${property.id}/boilers/${boiler.id}`}
                    className="mt-6 inline-flex font-semibold text-slate-900 hover:text-slate-600"
                  >
                    View Boiler →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}