"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setIsLoading(true);
    setMessage("");
    setIsSuccess(false);

    if (!password || !confirmPassword) {
      setMessage("Enter and confirm your new password.");
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
      setMessage("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      setMessage(
        "Your password has been updated. You can now sign in with your new password."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your password."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div>
          <Link
            href="/"
            className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400"
          >
            PermitWatch
          </Link>

          <h1 className="mt-3 text-3xl font-black text-white">
            Choose a new password
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Enter a new password for your PermitWatch
            account.
          </p>
        </div>

        {!isSuccess ? (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                New password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Confirm new password
              </label>

              <input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? "Updating password..."
                : "Update Password"}
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-500"
          >
            Sign In
          </Link>
        )}

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

        {!isSuccess && (
          <p className="mt-6 text-center text-sm text-slate-400">
            Back to{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-400 hover:text-emerald-300"
            >
              sign in
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}