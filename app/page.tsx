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

const coreFeatures = [
  {
    title: "Permit Tracking",
    description:
      "Keep permit records organized by property and boiler with expiration dates and compliance status in one place.",
  },
  {
    title: "AI Permit OCR",
    description:
      "Upload permit documents and extract key permit information without manually retyping every record.",
  },
  {
    title: "Document Library",
    description:
      "Store permit files alongside the properties and boilers they belong to, with view, download, and print access.",
  },
  {
    title: "Compliance Notifications",
    description:
      "Surface expiring permits and compliance issues before they become missed renewals or costly surprises.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link
            href="/"
            className="text-xl font-black tracking-tight text-white"
          >
            Permit<span className="text-emerald-400">Watch</span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white sm:inline-flex"
            >
              Pricing
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-white transition hover:border-emerald-500 hover:bg-slate-900"
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-800">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              Permit Compliance Management
            </p>

            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-tight tracking-tight text-white md:text-6xl">
              Know what&apos;s expiring before it becomes a problem.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              PermitWatch gives property managers, contractors, and building
              operators one place to track permits, boilers, documents,
              expiration dates, and compliance activity across an entire
              portfolio.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500"
              >
                Start with PermitWatch
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-6 py-3 font-bold text-white transition hover:border-emerald-500 hover:bg-slate-900"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              Built for real portfolios
            </p>

            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-500">Portfolio visibility</p>
                <p className="mt-2 text-2xl font-black text-white">
                  Properties → Boilers → Permits
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-500">Compliance workflow</p>
                <p className="mt-2 text-2xl font-black text-white">
                  Upload. Extract. Track. Renew.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-sm text-slate-500">Document control</p>
                <p className="mt-2 text-2xl font-black text-white">
                  View, download, print, and preserve history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
            One system
          </p>

          <h2 className="mt-4 text-4xl font-black text-white">
            Everything you need to stay ahead of permit compliance
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {coreFeatures.map((feature) => (
            <article
              key={feature.title}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-7"
            >
              <h3 className="text-xl font-black text-white">
                {feature.title}
              </h3>

              <p className="mt-3 leading-7 text-slate-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="pricing"
        className="border-y border-slate-800 bg-slate-900/40"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              PermitWatch Pricing
            </p>

            <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">
              Simple pricing that grows with your portfolio
            </h2>

            <p className="mt-4 text-lg leading-8 text-slate-400">
              Every plan includes unlimited boilers, unlimited permit history,
              AI-powered OCR, document storage, and automated compliance
              tracking.
            </p>

            <div className="mt-8 flex justify-center">
              <span className="rounded-full bg-emerald-900/40 px-5 py-2 text-sm font-semibold text-emerald-300">
                Annual plans available — save two months
              </span>
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
                  <h3 className="text-2xl font-black text-white">
                    {plan.name}
                  </h3>

                  <p className="mt-2 text-sm font-semibold text-emerald-400">
                    {plan.propertyLimit}
                  </p>

                  <div className="mt-5 flex items-end gap-2">
                    <p className="text-5xl font-black text-white">
                      {plan.price}
                    </p>

                    {plan.price !== "Custom" && (
                      <p className="pb-2 text-slate-400">/month</p>
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
          </div>

          <div className="mx-auto mt-12 max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h3 className="text-2xl font-black text-white">
              What counts as a property?
            </h3>

            <p className="mt-4 leading-7 text-slate-400">
              A property is one managed building or site. Each property may
              contain multiple boilers, permit records, uploaded documents,
              and installation addresses without increasing the property
              count.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center lg:px-8">
        <h2 className="text-4xl font-black text-white">
          Put your permit portfolio on watch.
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-400">
          Start organizing your properties, boilers, permits, and compliance
          records in one place.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500"
          >
            Create Account
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-6 py-3 font-bold text-white transition hover:border-emerald-500 hover:bg-slate-900"
          >
            Sign In
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© 2026 PermitWatch. All rights reserved.</p>

          <div className="flex gap-5">
            <Link
              href="/pricing"
              className="transition hover:text-slate-300"
            >
              Pricing
            </Link>

            <Link
              href="/login"
              className="transition hover:text-slate-300"
            >
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}