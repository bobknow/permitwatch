"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

function getSafeNextPath(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default function LoginPage() {
  const searchParams = useSearchParams();

  const nextPath = getSafeNextPath(
    searchParams.get("next")
  );

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const callbackUrl = new URL(
        "/auth/callback",
        window.location.origin
      );

      callbackUrl.searchParams.set("next", nextPath);

      const { error } =
        await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            emailRedirectTo: callbackUrl.toString(),
            shouldCreateUser: false,
          },
        });

      if (error) {
        throw error;
      }

      setMessage(
        "Check your email for the PermitWatch login link."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to send the login link."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            PermitWatch
          </p>

          <h1 className="mt-3 text-3xl font-black text-white">
            Sign in to your account
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Enter your email and we&apos;ll send you a secure login link.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
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
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Sending link..."
              : "Send login link"}
          </button>
        </form>

        {message && (
          <p className="mt-5 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          New to PermitWatch?{" "}
          <Link
            href="/signup"
            className="font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}