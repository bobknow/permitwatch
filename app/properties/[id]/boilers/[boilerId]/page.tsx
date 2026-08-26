import Link from "next/link";
import { notFound } from "next/navigation";

import DeleteBoilerButton from "@/components/boilers/DeleteBoilerButton";
import ExtractPermitButton from "@/components/permits/ExtractPermitButton";
import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";


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
    serial_number
  `)
    .eq("id", boilerId)
    .eq("property_id", property.id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (boilerError || !boiler) {
    notFound();
  }

  const { data: currentPermit, error: permitError } = await supabase
    .from("permits")
    .select(`
      id,
      permit_number,
      status,
      ocr_status,
      storage_path,
      inspection_date,
      expiration_date,
      installation_address,
      inspector_name,
      inspector_firm,
      inspector_phone,
      created_at
    `)
    .eq("boiler_id", boiler.id)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (permitError) {
    console.error("Unable to load current permit:", permitError);
  }

  const propertyAddress = [
    property.address_line_1,
    property.city,
    property.state,
    property.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  function formatDate(date: string | null) {
    if (!date) {
      return "Not available";
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const needsExtraction =
    currentPermit &&
    (currentPermit.ocr_status === "pending" ||
      currentPermit.ocr_status === "failed");

  const today = new Date();

  const expirationDate = currentPermit?.expiration_date
    ? new Date(`${currentPermit.expiration_date}T00:00:00`)
    : null;

  let complianceLabel = "Unknown";
  let complianceColor = "bg-slate-100 text-slate-700";
  let complianceMessage = "No expiration date available";

  if (expirationDate) {
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const daysRemaining = Math.ceil(
      (expirationDate.getTime() - todayStart.getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {
      complianceLabel = "Expired";
      complianceColor = "bg-red-50 text-red-700";
      complianceMessage = `${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? "day" : "days"
        } overdue`;
    } else if (daysRemaining <= 30) {
      complianceLabel = "Expiring Soon";
      complianceColor = "bg-amber-50 text-amber-700";
      complianceMessage = `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"
        } remaining`;
    } else {
      complianceLabel = "Current";
      complianceColor = "bg-emerald-50 text-emerald-700";
      complianceMessage = `${daysRemaining} days remaining`;
    }
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
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {property.property_name}
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-900">
                Boiler #{boiler.boiler_number}
              </h1>

              <p className="mt-2 text-slate-600">
                {propertyAddress}
              </p>
            </div>

            {currentPermit ? (
              <div className="md:text-right">
                <span
                  className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${complianceColor}`}
                >
                  {complianceLabel}
                </span>

                <p className="mt-2 text-sm text-slate-500">
                  {complianceMessage}
                </p>
              </div>
            ) : (
              <span className="inline-flex w-fit rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                No Permit
              </span>
            )}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
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

            <div className="rounded-xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">
                Installation Address
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {currentPermit?.installation_address ||
                  propertyAddress ||
                  "Not provided"}
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-200 pt-6">
            <DeleteBoilerButton
              boilerId={boiler.id}
              boilerNumber={boiler.boiler_number}
            />
          </div>
        </section>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Current Permit
              </p>

              <h2 className="mt-2 text-3xl font-black text-slate-900">
                {currentPermit?.permit_number
                  ? `Permit #${currentPermit.permit_number}`
                  : "No Current Permit"}
              </h2>
            </div>

            {currentPermit && (
              <div className="md:text-right">
                <span
                  className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${complianceColor}`}
                >
                  {complianceLabel}
                </span>

                <p className="mt-2 text-sm text-slate-500">
                  {complianceMessage}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Expires {formatDate(currentPermit.expiration_date)}
                </p>
              </div>
            )}
          </div>

          {currentPermit ? (
            <>
              <div className="grid gap-x-8 gap-y-6 py-8 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Inspection Date
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(currentPermit.inspection_date)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Expiration Date
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatDate(currentPermit.expiration_date)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Installation Address
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {currentPermit.installation_address || "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Inspector
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {currentPermit.inspector_name || "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Inspector Company
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {currentPermit.inspector_firm || "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Inspector Phone
                  </p>

                  {currentPermit.inspector_phone ? (
                    <a
                      href={`tel:${currentPermit.inspector_phone}`}
                      className="mt-1 inline-block font-semibold text-slate-900 hover:underline"
                    >
                      {currentPermit.inspector_phone}
                    </a>
                  ) : (
                    <p className="mt-1 font-semibold text-slate-900">
                      Not available
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-6">
                <Link
                  href={`/properties/${property.id}/boilers/${boiler.id}/permits/new`}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Upload
                </Link>

                {needsExtraction && (
                  <ExtractPermitButton
                    permitId={currentPermit.id}
                    ocrStatus={currentPermit.ocr_status}
                  />
                )}

                {currentPermit.storage_path && (
                  <>
                    <a
                      href={`/api/permits/${currentPermit.id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      View PDF
                    </a>

                    <a
                      href={`/api/permits/${currentPermit.id}/download`}
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Download
                    </a>

                    <a
                      href={`/api/permits/${currentPermit.id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Print
                    </a>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="py-8">
              <p className="text-slate-600">
                Upload a permit to begin tracking this boiler’s compliance.
              </p>

              <Link
                href={`/properties/${property.id}/boilers/${boiler.id}/permits/new`}
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Upload Permit
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}