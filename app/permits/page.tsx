import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type PermitRow = {
  id: string;
  permit_number: string | null;
  issued_date: string | null;
  expiration_date: string | null;
  ocr_status: string | null;
  status: string | null;
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

  const expiration = new Date(`${date}T00:00:00`);

  return Math.ceil(
    (expiration.getTime() - todayStart.getTime()) /
      86_400_000
  );
}

function getPermitStatus(
  expirationDate: string | null,
  ocrStatus: string | null
) {
  if (ocrStatus !== "complete") {
    return {
      label: "OCR Pending",
      classes: "bg-slate-100 text-slate-700",
    };
  }

  const daysRemaining =
    getDaysRemaining(expirationDate);

  if (daysRemaining === null) {
    return {
      label: "Needs Review",
      classes: "bg-slate-100 text-slate-700",
    };
  }

  if (daysRemaining < 0) {
    return {
      label: "Expired",
      classes: "bg-red-50 text-red-700",
    };
  }

  if (daysRemaining <= 30) {
    return {
      label: "Due Soon",
      classes: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Current",
    classes: "bg-emerald-50 text-emerald-700",
  };
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not available";
  }

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PermitsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login?next=/permits");
  }

  const { data, error } = await supabase
    .from("permits")
    .select(`
      id,
      permit_number,
      issued_date,
      expiration_date,
      ocr_status,
      status,
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
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Unable to load permits:",
      error
    );
  }

  const allPermits =
    (data ?? []) as PermitRow[];

  /*
   * Only show the newest permit for each boiler.
   * Historical permit records remain preserved.
   */
  const latestPermitByBoiler =
    new Map<string, PermitRow>();

  for (const permit of allPermits) {
    const boilerId = permit.boiler?.id;

    if (
      boilerId &&
      !latestPermitByBoiler.has(boilerId)
    ) {
      latestPermitByBoiler.set(
        boilerId,
        permit
      );
    }
  }

  const permits = Array.from(
    latestPermitByBoiler.values()
  );

  const currentCount = permits.filter(
    (permit) =>
      getPermitStatus(
        permit.expiration_date,
        permit.ocr_status
      ).label === "Current"
  ).length;

  const dueSoonCount = permits.filter(
    (permit) =>
      getPermitStatus(
        permit.expiration_date,
        permit.ocr_status
      ).label === "Due Soon"
  ).length;

  const expiredCount = permits.filter(
    (permit) =>
      getPermitStatus(
        permit.expiration_date,
        permit.ocr_status
      ).label === "Expired"
  ).length;

  const pendingCount = permits.filter(
    (permit) =>
      permit.ocr_status !== "complete"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Compliance Records
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            Permits
          </h1>

          <p className="mt-2 text-slate-600">
            Review current boiler permits and compliance status.
          </p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Tracked Permits"
            value={permits.length}
          />

          <SummaryCard
            label="Current"
            value={currentCount}
            tone="success"
          />

          <SummaryCard
            label="Due Soon"
            value={dueSoonCount}
            tone="warning"
          />

          <SummaryCard
            label="Expired"
            value={expiredCount}
            tone={
              expiredCount > 0
                ? "danger"
                : "default"
            }
          />

          <SummaryCard
            label="OCR Pending"
            value={pendingCount}
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {permits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-slate-900">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
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
                      Expires
                    </th>

                    <th className="p-4 text-sm font-semibold text-slate-600">
                      Status
                    </th>

                    <th className="p-4" />
                  </tr>
                </thead>

                <tbody>
                  {permits.map((permit) => {
                    const permitStatus =
                      getPermitStatus(
                        permit.expiration_date,
                        permit.ocr_status
                      );

                    return (
                      <tr
                        key={permit.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="p-4 font-semibold text-slate-900">
                          {permit.permit_number ||
                            "Pending OCR"}
                        </td>

                        <td className="p-4 text-slate-700">
                          Boiler #
                          {permit.boiler?.boiler_number ||
                            "—"}
                        </td>

                        <td className="p-4 text-slate-700">
                          {permit.boiler?.property
                            ?.property_name ||
                            "Property unavailable"}
                        </td>

                        <td className="p-4 text-slate-700">
                          {formatDate(
                            permit.expiration_date
                          )}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${permitStatus.classes}`}
                          >
                            {permitStatus.label}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <Link
                            href={`/permits/${permit.id}`}
                            className="font-semibold text-slate-900 transition hover:text-emerald-700"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <h2 className="text-xl font-bold text-slate-900">
                No permits uploaded
              </h2>

              <p className="mt-2 text-slate-600">
                Upload a permit from a boiler record to begin tracking compliance.
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

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?:
    | "default"
    | "success"
    | "warning"
    | "danger";
}) {
  const valueClasses =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "danger"
          ? "text-red-700"
          : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-4xl font-black ${valueClasses}`}
      >
        {value}
      </p>
    </div>
  );
}