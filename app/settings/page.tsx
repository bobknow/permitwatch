import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";

import LogoutButton from "@/components/LogoutButton";

const planDetails = {
  starter: {
    name: "Starter",
    price: "$99/month",
    propertyLimit: 25,
  },
  growth: {
    name: "Growth",
    price: "$199/month",
    propertyLimit: 100,
  },
  professional: {
    name: "Professional",
    price: "$499/month",
    propertyLimit: 500,
  },
} as const;

type PlanName = keyof typeof planDetails;

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatLabel(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function subscriptionStatusClasses(
  status: string | null
) {
  if (
    status === "active" ||
    status === "trialing"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "past_due" ||
    status === "unpaid"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (
    status === "canceled" ||
    status === "incomplete_expired"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login?next=/settings");
  }

  const [
    tenantResult,
    usersResult,
    propertiesResult,
  ] = await Promise.all([
    supabase
      .from("tenants")
      .select(`
        id,
        name,
        email,
        company_type,
        is_active,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_price_id,
        subscription_status,
        subscription_plan,
        trial_ends_at,
        subscription_ends_at
      `)
      .eq("id", profile.tenant_id)
      .single(),

    supabase
      .from("profiles")
      .select(`
        id,
        role,
        is_active
      `)
      .eq("tenant_id", profile.tenant_id),

    supabase
      .from("properties")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("tenant_id", profile.tenant_id),
  ]);

  if (
    tenantResult.error ||
    !tenantResult.data
  ) {
    console.error(
      "Unable to load tenant settings:",
      tenantResult.error
    );

    redirect("/dashboard");
  }

  if (usersResult.error) {
    console.error(
      "Unable to load organization users:",
      usersResult.error
    );
  }

  if (propertiesResult.error) {
    console.error(
      "Unable to count properties:",
      propertiesResult.error
    );
  }

  const tenant = tenantResult.data;
  const userList = usersResult.data ?? [];
  const propertyCount =
    propertiesResult.count ?? 0;

  const currentPlanKey =
    tenant.subscription_plan &&
    tenant.subscription_plan in planDetails
      ? (tenant.subscription_plan as PlanName)
      : "starter";

  const currentPlan =
    planDetails[currentPlanKey];

  const activeUsers = userList.filter(
    (user) => user.is_active
  ).length;

  const administrators = userList.filter(
    (user) => user.role === "admin"
  ).length;

  const managers = userList.filter(
    (user) => user.role === "manager"
  ).length;

  const viewers = userList.filter(
    (user) => user.role === "viewer"
  ).length;

  const hasBillingAccount =
    Boolean(tenant.stripe_customer_id);

  const propertyPercentage = Math.min(
    100,
    Math.round(
      (propertyCount /
        currentPlan.propertyLimit) *
        100
    )
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-4xl font-black text-slate-900">
            Settings
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your PermitWatch account,
            organization, and subscription.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Current Subscription
              </p>

              <h2 className="mt-2 text-3xl font-black text-slate-900">
                {currentPlan.name}
              </h2>

              <p className="mt-2 text-lg font-semibold text-slate-700">
                {currentPlan.price}
              </p>

              <div className="mt-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${subscriptionStatusClasses(
                    tenant.subscription_status
                  )}`}
                >
                  {formatLabel(
                    tenant.subscription_status
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
  {tenant.subscription_status === "canceled" ? (
    <Link
      href="/pricing"
      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
    >
      Reactivate Subscription
    </Link>
  ) : hasBillingAccount ? (
    <Link
      href="/api/billing/portal"
      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
    >
      Manage Billing
    </Link>
  ) : (
    <Link
      href="/pricing"
      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
    >
      Choose a Plan
    </Link>
  )}

  <Link
  href="/pricing"
  className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:border-emerald-500 hover:bg-emerald-500"
>
  View Plans
</Link>
</div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <BillingStat
              label="Plan"
              value={currentPlan.name}
            />

            <BillingStat
              label="Monthly Price"
              value={currentPlan.price}
            />

            <BillingStat
              label="Renewal Date"
              value={formatDate(
                tenant.subscription_ends_at
              )}
            />

            <BillingStat
              label="Property Limit"
              value={`${currentPlan.propertyLimit}`}
            />
          </div>

          <div className="mt-8 rounded-xl bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  Property usage
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {propertyCount} of{" "}
                  {currentPlan.propertyLimit} managed
                  properties used
                </p>
              </div>

              <p className="text-lg font-black text-slate-900">
                {propertyPercentage}%
              </p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{
                  width: `${propertyPercentage}%`,
                }}
              />
            </div>
          </div>

          {tenant.subscription_status === "canceled" && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-lg font-bold text-red-800">
              Your PermitWatch subscription has been canceled.
             </p>

             <p className="mt-2 text-sm text-red-700">
               Adding new properties and boilers is disabled.
               Choose a plan to reactivate your account and
               restore access.
            </p>

          <div className="mt-4 flex flex-wrap gap-3">
       <Link
         href="/pricing"
         className="inline-flex items-center justify-center rounded-lg bg-red-700 px-5 py-3 font-semibold text-white transition hover:bg-red-600"
      >
          Reactivate Subscription
      </Link>

      {hasBillingAccount && (
        <Link
          href="/api/billing/portal"
          className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 transition hover:bg-red-100"
        >
          Manage Billing
        </Link>
      )}
    </div>
  </div>
)}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-black text-slate-900">
              Your Account
            </h2>

            <dl className="mt-6 space-y-5">
              <AccountField
                label="Name"
                value={
                  profile.full_name ||
                  "Not provided"
                }
              />

              <AccountField
                label="Email"
                value={
                  profile.email ||
                  "Not provided"
                }
              />

              <AccountField
                label="Role"
                value={formatLabel(
                  profile.role
                )}
              />

              <div>
  <dt className="text-sm font-medium text-slate-500">
    User Account
  </dt>

  <dd className="mt-2">
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
        profile.is_active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {profile.is_active
        ? "Enabled"
        : "Disabled"}
    </span>
  </dd>
</div>

<div>
  <dt className="text-sm font-medium text-slate-500">
    Subscription Access
  </dt>

  <dd className="mt-2">
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${subscriptionStatusClasses(
        tenant.subscription_status
      )}`}
    >
      {tenant.subscription_status === "active"
        ? "Active"
        : tenant.subscription_status === "trialing"
          ? "Trial"
          : tenant.subscription_status === "past_due"
            ? "Payment Past Due"
            : tenant.subscription_status === "canceled"
              ? "Canceled"
              : formatLabel(
                  tenant.subscription_status
                )}
    </span>
  </dd>
</div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-black text-slate-900">
              Organization
            </h2>

            <dl className="mt-6 space-y-5">
              <AccountField
                label="Organization Name"
                value={
                  tenant.name ||
                  "Not provided"
                }
              />

              <AccountField
                label="Organization Email"
                value={
                  tenant.email ||
                  "Not provided"
                }
              />

              <AccountField
                label="Company Type"
                value={formatLabel(
                  tenant.company_type
                )}
              />
            </dl>

            <div className="mt-8 divide-y divide-slate-200">
              <SettingRow
                label="Total Users"
                value={userList.length}
              />

              <SettingRow
                label="Active Users"
                value={activeUsers}
              />

              <SettingRow
                label="Administrators"
                value={administrators}
              />

              <SettingRow
                label="Managers"
                value={managers}
              />

              <SettingRow
                label="Viewers"
                value={viewers}
              />
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
             <div>
                 <h2 className="text-2xl font-black text-slate-900">
                     Account Actions
                </h2>

              <p className="mt-2 text-slate-600">
             Sign out of your PermitWatch account on this device.
            </p>
          </div>

            <div className="shrink-0">
             <LogoutButton />
              </div>
           </div>
         </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
  <h2 className="text-2xl font-black text-slate-900">
    Contact PermitWatch
  </h2>

  <p className="mt-2 text-slate-600">
    Questions about PermitWatch, your account, or general inquiries.
  </p>

  <div className="mt-5">
    <a
      href="mailto:info@getpermitwatch.com"
      className="font-semibold text-emerald-700 transition hover:text-emerald-600"
    >
      info@getpermitwatch.com
    </a>
  </div>
</section>
        </div>
      </div>
    </main>
  );
}

function BillingStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function AccountField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">
        {label}
      </dt>

      <dd className="mt-1 font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
      <span className="font-medium text-slate-600">
        {label}
      </span>

      <span className="text-xl font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}