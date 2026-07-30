import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type BoilerPageProps = {
  params: Promise<{
    id: string;
    boilerId: string;
  }>;
};

export default async function BoilerPage({
  params,
}: BoilerPageProps) {
  const { id, boilerId } = await params;

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    notFound();
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select(`
      id,
      property_name,
      address_line_1,
      city,
      state,
      postal_code
    `)
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (propertyError || !property) {
    notFound();
  }

  const { data: boiler, error: boilerError } = await supabase
    .from("boilers")
    .select(`
      id,
      property_id,
      boiler_number,
      model_number,
      serial_number,
      created_at
    `)
    .eq("id", boilerId)
    .eq("property_id", property.id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (boilerError || !boiler) {
    notFound();
  }

  const { data: permits, error: permitsError } = await supabase
    .from("permits")
    .select(`
      id,
      permit_number,
      status,
      source_filename,
      storage_path,
      ocr_status,
      issued_date,
      inspection_date,
      expiration_date,
      created_at
    `)
    .eq("boiler_id", boiler.id)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (permitsError) {
    console.error("Unable to load permits:", permitsError);
  }

  const permitHistory = permits ?? [];
  const currentPermit = permitHistory[0] ?? null;

  const fullAddress = [
    property.address_line_1,
    property.city,
    property.state,
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  function formatDate(date: string | null) {
    if (!date) {
      return null;
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  function formatStatus(status: string | null) {
    if (!status) {
      return "Pending";
    }

    return status
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  }

  return (
    <main className="p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/properties/${property.id}`}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to {property.property_name}
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {property.property_name}
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-900">
                Boiler #{boiler.boiler_number}
              </h1>

              <p className="mt-2 text-slate-600">
                {fullAddress}
              </p>
            </div>

            {currentPermit ? (
              <span className="inline-flex w-fit rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                {currentPermit.ocr_status === "pending"
                  ? "Pending Review"
                  : formatStatus(currentPermit.status)}
              </span>
            ) : (
              <span className="inline-flex w-fit rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                No Permit Uploaded
              </span>
            )}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Model Number
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {boiler.model_number || "Not provided"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Serial Number
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {boiler.serial_number || "Not provided"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Active Permit
              </h2>

              <p className="mt-2 text-slate-600">
                Upload and track the active permit for this boiler.
              </p>
            </div>

            <Link
              href={`/properties/${property.id}/boilers/${boiler.id}/permits/new`}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Upload Permit
            </Link>
          </div>

          {currentPermit ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    File
                  </p>

                  <p className="mt-1 break-all font-semibold text-slate-900">
                    {currentPermit.source_filename}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    OCR Status
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatStatus(currentPermit.ocr_status)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Permit Number
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {currentPermit.permit_number ||
                      "Pending extraction"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Permit Status
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatStatus(currentPermit.status)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Issued Date
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(currentPermit.issued_date) ||
                      "Pending extraction"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Inspection Date
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(currentPermit.inspection_date) ||
                      "Pending extraction"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Expiration Date
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(currentPermit.expiration_date) ||
                      "Pending extraction"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Uploaded
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {new Date(
                      currentPermit.created_at
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="font-semibold text-slate-900">
                No permit uploaded
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Upload a permit to begin tracking status and
                expiration.
              </p>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-slate-900">
            Permit History
          </h2>

          <p className="mt-2 text-slate-600">
            All permits uploaded for this boiler.
          </p>

          {permitHistory.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6">
              <p className="text-sm font-medium text-slate-500">
                No permit history yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {permitHistory.map((permit, index) => (
                <div
                  key={permit.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-all font-semibold text-slate-900">
                        {permit.source_filename}
                      </p>

                      {index === 0 && (
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                          Latest
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Uploaded{" "}
                      {new Date(
                        permit.created_at
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-slate-600">
                      {permit.permit_number ||
                        "Permit number pending"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {permit.ocr_status === "pending"
                        ? "Pending Review"
                        : formatStatus(permit.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}