import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type PermitPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(date: string | null) {
  if (!date) return "Not available";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

export default async function PermitPage({
  params,
}: PermitPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    notFound();
  }

  const { data: permit, error } = await supabase
    .from("permits")
    .select(`
      *,
      boiler:boilers(
        id,
        boiler_number,
        model_number,
        serial_number,
        property:properties(
          id,
          property_name,
          address_line_1,
          city,
          state,
          postal_code
        )
      )
    `)
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (error || !permit) {
    notFound();
  }

  const property = permit.boiler?.property;

  const address = property
    ? [
      property.address_line_1,
      property.city,
      property.state,
      property.postal_code,
    ]
      .filter(Boolean)
      .join(", ")
    : "Unknown";

  return (
    <main className="p-6 md:p-10">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/permits"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to Permits
        </Link>

        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

          <div>
            <p className="text-sm uppercase font-semibold tracking-wide text-slate-500">
              Permit
            </p>

            <h1 className="mt-2 text-4xl font-black text-slate-900">
              {permit.permit_number || "Pending OCR"}
            </h1>

            <p className="mt-2 text-slate-600">
              {property?.property_name}
            </p>
          </div>

          <div className="flex gap-3">

            <Link
              href={`/properties/${property?.id}/boilers/${permit.boiler?.id}`}
              className="rounded-lg bg-slate-900 px-5 py-3 font-semibold !text-white transition hover:bg-slate-700"
            >
              Boiler
            </Link>

            <Link
              href={`/properties/${property?.id}`}
              className="rounded-lg bg-slate-900 px-5 py-3 font-semibold !text-white transition hover:bg-slate-700"
            >
              Property
            </Link>

          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-black text-slate-900">
              Permit Information
            </h2>

            <dl className="mt-6 space-y-5">

              <div>
                <dt className="text-sm text-slate-500">
                  Permit Number
                </dt>

                <dd className="font-semibold text-slate-900">
                  {permit.permit_number || "Pending OCR"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">
                  Issue Date
                </dt>

                <dd className="font-semibold text-slate-900">
                  {formatDate(permit.issued_date)}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">
                  Expiration Date
                </dt>

                <dd className="font-semibold text-slate-900">
                  {formatDate(permit.expiration_date)}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">
                  Inspection Date
                </dt>

                <dd className="font-semibold text-slate-900">
                  {formatDate(permit.inspection_date)}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">
                  OCR Status
                </dt>

                <dd className="font-semibold text-slate-900">
                  {permit.ocr_status}
                </dd>
              </div>

            </dl>

          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-black text-slate-900">
              Boiler Information
            </h2>

            <dl className="mt-6 space-y-5">

              <div>
                <dt className="text-sm text-slate-500">
                  Boiler Number
                </dt>

                <dd className="font-semibold text-slate-900">
                  #{permit.boiler?.boiler_number}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">
                  Model
                </dt>

                <dd className="font-semibold text-slate-900">
                  {permit.boiler?.model_number || "Not provided"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">
                  Serial Number
                </dt>

                <dd className="font-semibold text-slate-900">
                  {permit.boiler?.serial_number || "Not provided"}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">
                  Property
                </dt>

                <dd className="font-semibold text-slate-900">
                  {property?.property_name}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">
                  Address
                </dt>

                <dd className="font-semibold text-slate-900">
                  {address}
                </dd>
              </div>

            </dl>

          </section>

        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          <div className="flex items-center justify-between">

            <h2 className="text-2xl font-black text-slate-900">
              Permit Document
            </h2>

            <div className="flex gap-3">

              <Link
                href={`/properties/${property?.id}/boilers/${permit.boiler?.id}`}
                className="rounded-lg bg-amber-500 px-4 py-2 font-semibold !text-white transition hover:bg-amber-600"
              >
                Replace Permit
              </Link>

            </div>

          </div>

          {permit.storage_path ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <p className="font-semibold text-slate-900">
                Original permit document
              </p>

              <p className="mt-2 text-sm text-slate-600">
                View, download, or print the uploaded permit.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/api/permits/${permit.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  View PDF
                </a>

                <a
                  href={`/api/permits/${permit.id}/download`}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-700"
                >
                  Download
                </a>

                <a
                  href={`/api/permits/${permit.id}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-700"
                >
                  Print Original
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="font-semibold text-slate-900">
                No document uploaded
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Upload a permit from the boiler page.
              </p>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}