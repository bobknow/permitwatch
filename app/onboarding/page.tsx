import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ensureTenantProfile } from "@/lib/ensureTenantProfile";

const allowedPlans = [
  "starter",
  "growth",
  "professional",
] as const;

type Plan = (typeof allowedPlans)[number];

function getPlan(value: string | undefined): Plan | null {
  if (
    value &&
    allowedPlans.includes(value as Plan)
  ) {
    return value as Plan;
  }

  return null;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
  }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  let profile;

  try {
    profile = await ensureTenantProfile(user);
  } catch (error) {
    console.error(
      "Unable to provision PermitWatch onboarding:",
      error
    );

    redirect("/signup?error=provisioning_failed");
  }
const { data: tenant, error: tenantError } =
  await supabase
    .from("tenants")
    .select(`
      subscription_status,
      stripe_subscription_id
    `)
    .eq("id", profile.tenant_id)
    .single();

if (tenantError) {
  console.error(
    "Unable to load onboarding subscription:",
    tenantError
  );
}

const params = await searchParams;

const selectedPlan = getPlan(params.plan);

/*
 * Existing paid subscribers should not be sent
 * back through onboarding when simply signing in.
 */
const hasActiveSubscription =
  tenant?.subscription_status === "active" ||
  tenant?.subscription_status === "trialing";

if (hasActiveSubscription && !selectedPlan) {
  redirect("/dashboard");
}

if (selectedPlan) {
  redirect(
    `/api/billing/checkout?plan=${selectedPlan}`
  );
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <section className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl md:p-12">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            PermitWatch
          </p>

          <h1 className="mt-4 text-4xl font-black text-white">
            Welcome, {profile.full_name || "there"}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Your organization is ready. Choose the
            PermitWatch plan that fits your portfolio
            to continue.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 font-black text-white">
              ✓
            </span>

            <h2 className="mt-5 text-lg font-black text-white">
              Account created
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Your administrator profile and
              PermitWatch organization are ready.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 font-black text-white">
              2
            </span>

            <h2 className="mt-5 text-lg font-black text-white">
              Choose a plan
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Select the subscription that matches
              your property portfolio.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 font-black text-white">
              3
            </span>

            <h2 className="mt-5 text-lg font-black text-white">
              Add your portfolio
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Once subscribed, add customers,
              properties, boilers, and permits.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-950 p-6">
          <h2 className="text-2xl font-black text-white">
            Choose your PermitWatch plan
          </h2>

          <p className="mt-2 text-slate-400">
            Select a plan to activate your account and
            continue into PermitWatch.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              href="/api/billing/checkout?plan=starter"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 font-bold text-white transition hover:border-emerald-500 hover:bg-slate-900"
            >
              Starter — $99
            </Link>

            <Link
              href="/api/billing/checkout?plan=growth"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-500"
            >
              Growth — $199
            </Link>

            <Link
              href="/api/billing/checkout?plan=professional"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 font-bold text-white transition hover:border-emerald-500 hover:bg-slate-900"
            >
              Professional — $499
            </Link>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            You&apos;ll be redirected to secure Stripe
            Checkout to complete your subscription.
          </p>
        </div>
      </section>
    </main>
  );
}