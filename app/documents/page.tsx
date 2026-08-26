import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type DocumentRow = {
  id: string;
  permit_number: string | null;
  source_filename: string | null;
  storage_path: string | null;
  created_at: string;
  boiler: {
    id: string;
    boiler_number: string | null;
    property: {
      id: string;
      property_name: string | null;
    } | null;
  } | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

export default async function DocumentsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login?next=/documents");
  }

  const { data, error } = await supabase
    .from("permits")
    .select(`
      id,
      permit_number,
      source_filename,
      storage_path,
      created_at,
      boiler:boilers(
        id,
        boiler_number,
        property:properties(
          id,
          property_name
        )
      )
    `)
    .eq("tenant_id", profile.tenant_id)
    .not("storage_path", "is", null)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Unable to load documents:",
      error
    );
  }

  const documents: DocumentRow[] = (data ?? []).map((row) => {
    const boiler = Array.isArray(row.boiler)
      ? row.boiler[0] ?? null
      : row.boiler;

    const property = boiler
      ? Array.isArray(boiler.property)
        ? boiler.property[0] ?? null
        : boiler.property
      : null;

    return {
      id: row.id,
      permit_number: row.permit_number,
      source_filename: row.source_filename,
      storage_path: row.storage_path,
      created_at: row.created_at,
      boiler: boiler
        ? {
          id: boiler.id,
          boiler_number: boiler.boiler_number,
          property,
        }
        : null,
    };
  });;

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Document Library
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            Documents
          </h1>

          <p className="mt-2 text-slate-600">
            View and download uploaded permit
            documents across your portfolio.
          </p>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Permit Documents
              </h2>

              <p className="mt-1 text-slate-600">
                Historical documents remain available
                even when a newer permit is uploaded.
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">
              {documents.length}{" "}
              {documents.length === 1
                ? "Document"
                : "Documents"}
            </span>
          </div>

          {documents.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-900">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="p-4 text-sm font-semibold text-slate-600">
                        Document
                      </th>

                      <th className="p-4 text-sm font-semibold text-slate-600">
                        Permit
                      </th>

                      <th className="p-4 text-sm font-semibold text-slate-600">
                        Boiler
                      </th>

                      <th className="p-4 text-sm font-semibold text-slate-600">
                        Property
                      </th>

                      <th className="p-4 text-sm font-semibold text-slate-600">
                        Uploaded
                      </th>

                      <th className="p-4" />
                    </tr>
                  </thead>

                  <tbody>
                    {documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="p-4">
                          <p className="max-w-xs truncate font-semibold text-slate-900">
                            {doc.source_filename ||
                              "Permit Document"}
                          </p>
                        </td>

                        <td className="p-4 text-slate-700">
                          {doc.permit_number
                            ? `#${doc.permit_number}`
                            : "Pending OCR"}
                        </td>

                        <td className="p-4 text-slate-700">
                          Boiler #
                          {doc.boiler?.boiler_number ||
                            "—"}
                        </td>

                        <td className="p-4 text-slate-700">
                          {doc.boiler?.property
                            ?.property_name ||
                            "Property unavailable"}
                        </td>

                        <td className="p-4 text-slate-700">
                          {formatDate(
                            doc.created_at
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <a
                              href={`/api/permits/${doc.id}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              View
                            </a>

                            <a
                              href={`/api/permits/${doc.id}/download`}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Download
                            </a>

                            <Link
                              href={`/permits/${doc.id}`}
                              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold !text-white transition hover:bg-slate-700"
                            >
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                No documents uploaded
              </h2>

              <p className="mx-auto mt-3 max-w-md text-slate-600">
                Permit documents will appear here after
                they are uploaded from a boiler record.
              </p>

              <Link
                href="/properties"
                className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                View Properties
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}