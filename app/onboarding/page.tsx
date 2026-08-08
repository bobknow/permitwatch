import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/currentProfile";

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/signup");
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
            Your organization has been created. Complete the next steps to begin
            tracking properties, boilers, and permit compliance.
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
              Your administrator profile and PermitWatch organization are ready.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 font-black text-white">
              2
            </span>

            <h2 className="mt-5 text-lg font-black text-white">
              Choose a plan
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Select the PermitWatch subscription that fits your portfolio.
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
              Create your first customer, property, boiler, and permit record.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-950 p-6">
          <h2 className="text-2xl font-black text-white">
            Start with PermitWatch
          </h2>

          <p className="mt-2 text-slate-400">
            Subscription checkout is the next step. Until Stripe is connected,
            you can continue into the application for development testing.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500"
            >
              Choose a Plan
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-6 py-3 font-bold text-slate-200 transition hover:border-emerald-500 hover:text-white"
            >
              Continue to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}