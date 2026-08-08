import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/currentProfile";
import { stripe } from "@/lib/stripe";

type BillingSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function BillingSuccessPage({
  searchParams,
}: BillingSuccessPageProps) {
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login");
  }

  const { session_id: sessionId } =
    await searchParams;

  let paymentConfirmed = false;

  if (sessionId) {
    try {
      const session =
        await stripe.checkout.sessions.retrieve(
          sessionId
        );

      paymentConfirmed =
        session.status === "complete" &&
        session.client_reference_id ===
          profile.tenant_id;
    } catch (error) {
      console.error(
        "Unable to verify checkout session:",
        error
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl md:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-3xl font-black text-white">
          ✓
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
          PermitWatch
        </p>

        <h1 className="mt-3 text-4xl font-black text-white">
          {paymentConfirmed
            ? "Subscription started"
            : "Checkout received"}
        </h1>

        <p className="mt-4 leading-7 text-slate-400">
          {paymentConfirmed
            ? "Your payment was completed. Stripe is finalizing your PermitWatch subscription."
            : "Your checkout was received. Your account will update when Stripe confirms the subscription."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500"
          >
            Continue to Dashboard
          </Link>

          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-6 py-3 font-bold text-slate-200 transition hover:border-emerald-500 hover:text-white"
          >
            Account Settings
          </Link>
        </div>
      </section>
    </main>
  );
}