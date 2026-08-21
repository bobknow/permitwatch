"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const allowedCompanyTypes = [
  {
    value: "property_management",
    label: "Property Management",
  },
  {
    value: "contractor",
    label: "Contractor",
  },
  {
    value: "building_owner",
    label: "Building Owner",
  },
  {
    value: "other",
    label: "Other",
  },
];

const allowedPlans = [
  "starter",
  "growth",
  "professional",
] as const;

type Plan = (typeof allowedPlans)[number];

const planDetails: Record<
  Plan,
  {
    name: string;
    price: string;
  }
> = {
  starter: {
    name: "Starter",
    price: "$99/month",
  },
  growth: {
    name: "Growth",
    price: "$199/month",
  },
  professional: {
    name: "Professional",
    price: "$499/month",
  },
};

function getPlan(
  value: string | null
): Plan | null {
  if (
    value &&
    allowedPlans.includes(value as Plan)
  ) {
    return value as Plan;
  }

  return null;
}

function SignupForm() {
  const searchParams = useSearchParams();

  const selectedPlan = getPlan(
    searchParams.get("plan")
  );

  const [fullName, setFullName] =
    useState("");
  const [companyName, setCompanyName] =
    useState("");
  const [companyType, setCompanyType] =
    useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);
  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [message, setMessage] =
    useState("");
  const [isLoading, setIsLoading] =
    useState(false);
  const [isSuccess, setIsSuccess] =
    useState(false);

  const onboardingPath = selectedPlan
    ? `/onboarding?plan=${selectedPlan}`
    : "/onboarding";

  const loginHref = selectedPlan
    ? `/login?next=${encodeURIComponent(
        onboardingPath
      )}`
    : "/login";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsLoading(true);
    setMessage("");
    setIsSuccess(false);

    const trimmedFullName =
      fullName.trim();

    const trimmedCompanyName =
      companyName.trim();

    const trimmedEmail = email
      .trim()
      .toLowerCase();

    if (
      !trimmedFullName ||
      !trimmedCompanyName ||
      !companyType ||
      !trimmedEmail ||
      !password ||
      !confirmPassword
    ) {
      setMessage(
        "Complete all required fields."
      );
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage(
        "Password must be at least 8 characters."
      );
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "Passwords do not match."
      );
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const callbackUrl = new URL(
        "/auth/callback",
        window.location.origin
      );

      callbackUrl.searchParams.set(
        "next",
        onboardingPath
      );

      const { data, error } =
        await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo:
              callbackUrl.toString(),
            data: {
              full_name:
                trimmedFullName,
              company_name:
                trimmedCompanyName,
              company_type:
                companyType,
              selected_plan:
                selectedPlan ?? null,
            },
          },
        });

      if (error) {
        throw error;
      }

      setIsSuccess(true);

      if (data.session) {
        window.location.href =
          onboardingPath;
        return;
      }

      setMessage(
        selectedPlan
          ? `Account created. Check your email to verify your address. After verification, we'll continue setting up your ${planDetails[selectedPlan].name} plan.`
          : "Account created. Check your email to verify your address and continue setting up PermitWatch."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create your account."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div>
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400"
          >
            PermitWatch
          </Link>

          <h1 className="mt-3 text-3xl font-black text-white">
            Create your account
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Set up your organization and start
            tracking boiler permits.
          </p>

          {selectedPlan && (
            <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  Selected plan
                </p>

                <p className="mt-1 font-bold text-white">
                  {
                    planDetails[
                      selectedPlan
                    ].name
                  }
                </p>
              </div>

              <p className="font-bold text-emerald-300">
                {
                  planDetails[
                    selectedPlan
                  ].price
                }
              </p>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="full_name"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Full name
            </label>

            <input
              id="full_name"
              type="text"
              value={fullName}
              onChange={(event) =>
                setFullName(
                  event.target.value
                )
              }
              required
              autoComplete="name"
              placeholder="Jordan Carter"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor="company_name"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Company or organization name
            </label>

            <input
              id="company_name"
              type="text"
              value={companyName}
              onChange={(event) =>
                setCompanyName(
                  event.target.value
                )
              }
              required
              autoComplete="organization"
              placeholder="Redwood Property Management"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor="company_type"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Company type
            </label>

            <select
              id="company_type"
              value={companyType}
              onChange={(event) =>
                setCompanyType(
                  event.target.value
                )
              }
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500"
            >
              <option value="">
                Select company type
              </option>

              {allowedCompanyTypes.map(
                (type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm_password"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Confirm password
            </label>

            <div className="relative">
              <input
                id="confirm_password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmed password"
                    : "Show confirmed password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
              >
                {showConfirmPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isLoading || isSuccess
            }
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Creating account..."
              : isSuccess
                ? "Account created"
                : selectedPlan
                  ? `Continue with ${planDetails[selectedPlan].name}`
                  : "Create Account"}
          </button>
        </form>

        {message && (
          <p
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              isSuccess
                ? "border-emerald-800 bg-emerald-950 text-emerald-200"
                : "border-red-800 bg-red-950 text-red-200"
            }`}
          >
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
          <div className="text-sm text-slate-400">
            Loading PermitWatch...
          </div>
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}