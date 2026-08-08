import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type PermitRecord = {
  id: string;
  boiler_id: string;
  permit_number: string | null;
  expiration_date: string | null;
  ocr_status: string | null;
  status: string | null;
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login?next=/dashboard");
  }

  const tenantId = profile.tenant_id;

  const [
    propertiesResult,
    boilersResult,
    customersResult,
    permitsResult,
    tenantResult,
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("tenant_id", tenantId),

    supabase
      .from("boilers")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("tenant_id", tenantId),

    supabase
      .from("customers")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("tenant_id", tenantId),

    supabase
      .from("permits")
      .select(`
        id,
        boiler_id,
        permit_number,
        expiration_date,
        ocr_status,
        status,
        created_at
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("tenants")
      .select(`
        subscription_plan,
        subscription_status
      `)
      .eq("id", tenantId)
      .single(),
  ]);

  if (propertiesResult.error) {
    console.error(
      "Dashboard properties error:",
      propertiesResult.error
    );
  }

  if (boilersResult.error) {
    console.error(
      "Dashboard boilers error:",
      boilersResult.error
    );
  }

  if (customersResult.error) {
    console.error(
      "Dashboard customers error:",
      customersResult.error
    );
  }

  if (permitsResult.error) {
    console.error(
      "Dashboard permits error:",
      permitsResult.error
    );
  }

  const propertyCount =
    propertiesResult.count ?? 0;

  const boilerCount =
    boilersResult.count ?? 0;

  const customerCount =
    customersResult.count ?? 0;

  const permitList =
    (permitsResult.data ?? []) as PermitRecord[];

  /*
   * Only use the newest permit for each boiler.
   * Historical permits remain preserved but do not
   * distort the compliance dashboard.
   */
  const latestPermitByBoiler =
    new Map<string, PermitRecord>();

  for (const permit of permitList) {
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

  const currentPermits = Array.from(
    latestPermitByBoiler.values()
  );

  const currentCount =
    currentPermits.filter((permit) => {
      const daysRemaining =
        getDaysRemaining(
          permit.expiration_date
        );

      return (
        daysRemaining !== null &&
        daysRemaining > 30
      );
    }).length;

  const expiringSoonCount =
    currentPermits.filter((permit) => {
      const daysRemaining =
        getDaysRemaining(
          permit.expiration_date
        );

      return (
        daysRemaining !== null &&
        daysRemaining >= 0 &&
        daysRemaining <= 30
      );
    }).length;

  const expiredCount =
    currentPermits.filter((permit) => {
      const daysRemaining =
        getDaysRemaining(
          permit.expiration_date
        );

      return (
        daysRemaining !== null &&
        daysRemaining < 0
      );
    }).length;

  const missingPermitCount = Math.max(
    0,
    boilerCount -
      latestPermitByBoiler.size
  );

  const ocrPendingCount =
    currentPermits.filter(
      (permit) =>
        permit.ocr_status !== "complete"
    ).length;

  const compliantBoilers =
    currentCount + expiringSoonCount;

  const complianceScore =
    boilerCount > 0
      ? Math.round(
          (compliantBoilers /
            boilerCount) *
            100
        )
      : 100;

  const needsAttention =
    expiredCount +
    missingPermitCount +
    ocrPendingCount;

  const plan =
    tenantResult.data
      ?.subscription_plan ??
    "starter";

  const subscriptionStatus =
    tenantResult.data
      ?.subscription_status ??
    "unknown";

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Compliance Overview
            </p>

            <h1 className="mt-2 text-4xl font-black text-slate-900">
              Dashboard
            </h1>

            <p className="mt-2 text-slate-600">
              Welcome back
              {profile.full_name
                ? `, ${profile.full_name}`
                : ""}
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold capitalize text-slate-700 shadow-sm">
              {plan} Plan
            </span>

            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                subscriptionStatus ===
                  "active" ||
                subscriptionStatus ===
                  "trialing"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {subscriptionStatus ===
              "active"
                ? "Subscription Active"
                : subscriptionStatus ===
                    "trialing"
                  ? "Trial Active"
                  : "Subscription Attention"}
            </span>
          </div>
        </div>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            title="Properties"
            value={propertyCount}
            subtitle="Managed buildings"
            href="/properties"
          />

          <DashboardCard
            title="Boilers"
            value={boilerCount}
            subtitle="Tracked equipment"
            href="/boilers"
          />

          <DashboardCard
            title="Expiring Soon"
            value={expiringSoonCount}
            subtitle="Within 30 days"
            href="/permits"
            tone="warning"
          />

          <DashboardCard
            title="Expired"
            value={expiredCount}
            subtitle="Immediate attention"
            href="/permits"
            tone={
              expiredCount > 0
                ? "danger"
                : "default"
            }
          />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Portfolio Compliance
                </p>

                <h2 className="mt-2 text-3xl font-black text-slate-900">
                  {complianceScore}%
                </h2>

                <p className="mt-2 text-slate-600">
                  Based on the current permit
                  status of tracked boilers.
                </p>
              </div>

              <div
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  complianceScore >= 90
                    ? "bg-emerald-100 text-emerald-800"
                    : complianceScore >=
                        70
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {complianceScore >= 90
                  ? "Healthy"
                  : complianceScore >= 70
                    ? "Needs Attention"
                    : "At Risk"}
              </div>
            </div>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{
                  width: `${complianceScore}%`,
                }}
              />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <ComplianceMetric
                label="Current Permits"
                value={currentCount}
                description="More than 30 days remaining"
              />

              <ComplianceMetric
                label="Expiring Soon"
                value={expiringSoonCount}
                description="30 days or less remaining"
              />

              <ComplianceMetric
                label="Expired"
                value={expiredCount}
                description="Past expiration date"
              />

              <ComplianceMetric
                label="No Permit"
                value={missingPermitCount}
                description="Boilers without permit records"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Needs Attention
            </p>

            <p className="mt-2 text-4xl font-black text-slate-900">
              {needsAttention}
            </p>

            <p className="mt-2 text-slate-600">
              Compliance items that may need
              review.
            </p>

            <div className="mt-6 space-y-4">
              <AttentionRow
                label="Expired Permits"
                value={expiredCount}
              />

              <AttentionRow
                label="Missing Permits"
                value={missingPermitCount}
              />

              <AttentionRow
                label="OCR Pending"
                value={ocrPendingCount}
              />
            </div>

            <Link
              href="/permits"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Review Permits
            </Link>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-black text-slate-900">
              Portfolio
            </h2>

            <div className="mt-6 divide-y divide-slate-200">
              <PortfolioRow
                label="Customers"
                value={customerCount}
                href="/customers"
              />

              <PortfolioRow
                label="Properties"
                value={propertyCount}
                href="/properties"
              />

              <PortfolioRow
                label="Boilers"
                value={boilerCount}
                href="/boilers"
              />

              <PortfolioRow
                label="Current Permit Records"
                value={
                  latestPermitByBoiler.size
                }
                href="/permits"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-black text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-2 text-slate-600">
              Jump into the most common PermitWatch
              workflows.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <QuickAction
                href="/customers"
                title="Customers"
                description="Manage accounts"
              />

              <QuickAction
                href="/properties/new"
                title="Add Property"
                description="Create a building"
              />

              <QuickAction
                href="/properties"
                title="Add Boiler"
                description="Select a property"
              />

              <QuickAction
                href="/permits"
                title="Permits"
                description="Review compliance"
              />

              <QuickAction
                href="/documents"
                title="Documents"
                description="View files"
              />

              <QuickAction
                href="/notifications"
                title="Notifications"
                description="Review alerts"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
  subtitle,
  href,
  tone = "default",
}: {
  title: string;
  value: number;
  subtitle: string;
  href: string;
  tone?: "default" | "warning" | "danger";
}) {
  const valueClasses =
    tone === "danger"
      ? "text-red-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-slate-900";

  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-sm font-semibold text-slate-500">
        {title}
      </p>

      <p
        className={`mt-3 text-4xl font-black ${valueClasses}`}
      >
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {subtitle}
      </p>
    </Link>
  );
}

function ComplianceMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-700">
          {label}
        </p>

        <span className="text-2xl font-black text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function AttentionRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="font-medium text-slate-700">
        {label}
      </span>

      <span className="font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}

function PortfolioRow({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-4 transition first:pt-0 last:pb-0 hover:text-emerald-700"
    >
      <span className="font-semibold text-slate-700">
        {label}
      </span>

      <span className="text-xl font-black text-slate-900">
        {value}
      </span>
    </Link>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
    >
      <p className="font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </Link>
  );
}