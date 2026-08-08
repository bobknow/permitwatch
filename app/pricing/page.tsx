import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "$99",
    propertyLimit: "25 Managed Properties",
    description:
      "For independent contractors, building owners, and smaller property portfolios.",
    features: [
      "25 Managed Properties",
      "Unlimited Boilers",
      "Unlimited Permit History",
      "Unlimited Documents",
      "AI Permit OCR",
      "Compliance Notifications",
      "Email Reminders",
      "Up to 3 Users",
    ],
    buttonLabel: "Start Starter",
    href: "/api/billing/checkout?plan=starter",
    featured: false,
  },
  {
    name: "Growth",
    price: "$199",
    propertyLimit: "100 Managed Properties",
    description:
      "For growing property managers and mechanical service companies.",
    features: [
      "100 Managed Properties",
      "Unlimited Boilers",
      "Unlimited Permit History",
      "Unlimited Documents",
      "Everything in Starter",
      "Compliance Dashboard",
      "Priority OCR Processing",
      "Unlimited Users",
      "Priority Support",
    ],
    buttonLabel: "Start Growth",
    href: "/api/billing/checkout?plan=growth",
    featured: true,
  },
  {
    name: "Professional",
    price: "$499",
    propertyLimit: "500 Managed Properties",
    description:
      "For large portfolios requiring advanced compliance management.",
    features: [
      "500 Managed Properties",
      "Unlimited Boilers",
      "Unlimited Permit History",
      "Unlimited Documents",
      "Everything in Growth",
      "Portfolio Reporting",
      "Bulk Property Import",
      "API Access — Coming Soon",
      "BoilerWatch Ready",
    ],
    buttonLabel: "Start Professional",
    href: "/api/billing/checkout?plan=professional",
    featured: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    propertyLimit: "Unlimited Properties",
    description:
      "For enterprise operators requiring custom onboarding, reporting, and integrations.",
    features: [
      "Unlimited Properties",
      "Unlimited Boilers",
      "Unlimited Permit History",
      "Unlimited Documents",
      "Everything in Professional",
      "Dedicated Account Manager",
      "Custom Integrations",
      "Priority SLA Support",
      "BoilerWatch Enterprise",
    ],
    buttonLabel: "Contact Sales",
    href: "mailto:sales@permitwatch.com",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            PermitWatch Pricing
          </p>

          <h1 className="mt-4 text-4xl font-black text-white md:text-5xl">
            Simple pricing that grows with your portfolio
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-400">
            Every plan includes unlimited boilers, unlimited permit history,
            AI-powered OCR, document storage, and automated compliance tracking.
          </p>

          <div className="mt-8 flex justify-center">
            <span className="rounded-full bg-emerald-900/40 px-5 py-2 text-sm font-semibold text-emerald-300">
              Annual plans available — save two months
            </span>
          </div>
        </div>

        <section className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full flex-col rounded-3xl border p-7 shadow-2xl ${
                plan.featured
                  ? "border-emerald-500 bg-slate-900"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              {plan.featured && (
                <span className="absolute right-5 top-5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                  Most Popular
                </span>
              )}

              <div>
                <h2 className="text-2xl font-black text-white">
                  {plan.name}
                </h2>

                <p className="mt-2 text-sm font-semibold text-emerald-400">
                  {plan.propertyLimit}
                </p>

                <div className="mt-5 flex items-end gap-2">
                  <p className="text-5xl font-black text-white">
                    {plan.price}
                  </p>

                  {plan.price !== "Custom" && (
                    <p className="pb-2 text-slate-400">
                      /month
                    </p>
                  )}
                </div>

                <p className="mt-5 leading-7 text-slate-400">
                  {plan.description}
                </p>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-slate-200"
                    >
                      <span className="mt-0.5 font-black text-emerald-400">
                        ✓
                      </span>

                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-8">
                {plan.href.startsWith("mailto:") ? (
                  <a
                    href={plan.href}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-700 px-5 py-3 font-bold text-white transition hover:border-emerald-500 hover:bg-slate-800"
                  >
                    {plan.buttonLabel}
                  </a>
                ) : (
                  <Link
                    href={plan.href}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 font-bold transition ${
                      plan.featured
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "border border-slate-700 text-white hover:border-emerald-500 hover:bg-slate-800"
                    }`}
                  >
                    {plan.buttonLabel}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-12 max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <h2 className="text-2xl font-black text-white">
            What counts as a property?
          </h2>

          <p className="mt-4 leading-7 text-slate-400">
            A property is one managed building or site. Each property may contain
            multiple boilers, permit records, uploaded documents, and installation
            addresses without increasing the property count.
          </p>
        </section>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-slate-500">
            Stripe Checkout will be connected to Starter, Growth, and
            Professional next.
          </p>

          <Link
            href="/dashboard"
            className="font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}