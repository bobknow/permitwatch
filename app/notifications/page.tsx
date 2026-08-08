import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";

type NoticeType = "expired" | "expiring" | "ocr";

type Notice = {
  id: string;
  type: NoticeType;
  title: string;
  message: string;
  permitId: string;
  urgency: number;
};

type PermitRow = {
  id: string;
  permit_number: string | null;
  expiration_date: string | null;
  ocr_status: string | null;
  source_filename: string | null;
  created_at: string;
  boiler: {
    id: string;
    boiler_number: string | null;
    property: {
      id: string;
      property_name: string | null;
      address_line_1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
    } | null;
  } | null;
};

function daysUntil(date: string) {
  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const target = new Date(
    `${date}T00:00:00`
  );

  return Math.ceil(
    (target.getTime() -
      todayStart.getTime()) /
      86_400_000
  );
}

function noticeClasses(type: NoticeType) {
  if (type === "expired") {
    return {
      badge: "bg-red-50 text-red-700",
      border: "border-red-200",
      label: "Expired",
    };
  }

  if (type === "expiring") {
    return {
      badge: "bg-amber-50 text-amber-700",
      border: "border-amber-200",
      label: "Expiring Soon",
    };
  }

  return {
    badge: "bg-slate-100 text-slate-700",
    border: "border-slate-200",
    label: "OCR Attention",
  };
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login?next=/notifications");
  }

  const { data, error } = await supabase
    .from("permits")
    .select(`
      id,
      permit_number,
      expiration_date,
      ocr_status,
      source_filename,
      created_at,
      boiler:boilers(
        id,
        boiler_number,
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
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Unable to load notifications:",
      error
    );
  }

  const allPermits: PermitRow[] = (data ?? []).map((row) => {
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
    expiration_date: row.expiration_date,
    ocr_status: row.ocr_status,
    source_filename: row.source_filename,
    created_at: row.created_at,
    boiler: boiler
      ? {
          id: boiler.id,
          boiler_number: boiler.boiler_number,
          property,
        }
      : null,
  };
});
  /*
   * Only alert from the newest permit for each boiler.
   * Historical permits remain preserved but should not
   * continue producing compliance alerts.
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

  const notices: Notice[] = [];

  for (const permit of permits) {
    const boiler = permit.boiler;
    const property = boiler?.property;

    const propertyName =
      property?.property_name ||
      property?.address_line_1 ||
      "Unknown property";

    const boilerNumber =
      boiler?.boiler_number || "—";

    const permitName =
      permit.permit_number ||
      permit.source_filename ||
      "Pending permit";

    if (permit.expiration_date) {
      const remaining = daysUntil(
        permit.expiration_date
      );

      if (remaining < 0) {
        const overdue = Math.abs(remaining);

        notices.push({
          id: `expired-${permit.id}`,
          type: "expired",
          title: `Permit ${permitName} is expired`,
          message: `${propertyName}, Boiler #${boilerNumber} — ${overdue} ${
            overdue === 1 ? "day" : "days"
          } overdue.`,
          permitId: permit.id,
          urgency: -overdue,
        });
      } else if (remaining <= 30) {
        notices.push({
          id: `expiring-${permit.id}`,
          type: "expiring",
          title: `Permit ${permitName} expires soon`,
          message: `${propertyName}, Boiler #${boilerNumber} — ${remaining} ${
            remaining === 1 ? "day" : "days"
          } remaining.`,
          permitId: permit.id,
          urgency: remaining,
        });
      }
    }

    if (permit.ocr_status !== "complete") {
      notices.push({
        id: `ocr-${permit.id}`,
        type: "ocr",
        title:
          "Permit extraction needs attention",
        message: `${propertyName}, Boiler #${boilerNumber} — OCR status: ${
          permit.ocr_status || "pending"
        }.`,
        permitId: permit.id,
        urgency: 1000,
      });
    }
  }

  notices.sort(
    (a, b) => a.urgency - b.urgency
  );

  const expiredCount = notices.filter(
    (notice) => notice.type === "expired"
  ).length;

  const expiringCount = notices.filter(
    (notice) => notice.type === "expiring"
  ).length;

  const ocrCount = notices.filter(
    (notice) => notice.type === "ocr"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Compliance Inbox
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            Notifications
          </h1>

          <p className="mt-2 text-slate-600">
            Compliance items that need your attention.
          </p>
        </div>

        <section className="mt-8 grid gap-5 sm:grid-cols-3">
          <SummaryCard
            label="Expired"
            value={expiredCount}
            valueClass="text-red-700"
          />

          <SummaryCard
            label="Expiring Soon"
            value={expiringCount}
            valueClass="text-amber-700"
          />

          <SummaryCard
            label="OCR Attention"
            value={ocrCount}
            valueClass="text-slate-900"
          />
        </section>

        <section className="mt-8">
          {notices.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">
                ✓
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-900">
                Everything looks good
              </h2>

              <p className="mt-3 text-slate-600">
                There are no expired, expiring, or pending OCR items.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => {
                const styles =
                  noticeClasses(notice.type);

                return (
                  <article
                    key={notice.id}
                    className={`rounded-2xl border bg-white p-6 shadow-sm ${styles.border}`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}
                          >
                            {styles.label}
                          </span>

                          <h2 className="text-lg font-black text-slate-900">
                            {notice.title}
                          </h2>
                        </div>

                        <p className="mt-3 text-slate-600">
                          {notice.message}
                        </p>
                      </div>

                      <Link
                        href={`/permits/${notice.permitId}`}
                        className="inline-flex w-fit items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-700"
                      >
                        Review Permit
                      </Link>
                    </div>
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

function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-4xl font-black ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}