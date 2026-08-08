"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          customer_type: formData.get("customer_type"),
          contact_name: formData.get("contact_name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          address_line_1: formData.get("address_line_1"),
          address_line_2: formData.get("address_line_2"),
          city: formData.get("city"),
          state: formData.get("state"),
          postal_code: formData.get("postal_code"),
          notes: formData.get("notes"),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save customer.");
      }

      router.push(`/customers/${result.customer.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save customer."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/customers"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to Customers
        </Link>

        <div className="mt-6">
          <h1 className="text-4xl font-black text-slate-900">
            Add Customer
          </h1>

          <p className="mt-2 text-slate-600">
            Create a customer record for a building owner, property manager, or contractor.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="text-sm font-semibold text-slate-700"
              >
                Customer or Company Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Acme Property Management"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="contact_name"
                className="text-sm font-semibold text-slate-700"
              >
                Primary Contact
              </label>

              <input
                id="contact_name"
                name="contact_name"
                type="text"
                placeholder="Jane Smith"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="customer_type"
                className="text-sm font-semibold text-slate-700"
              >
                Customer Type
              </label>

              <select
                id="customer_type"
                name="customer_type"
                required
                defaultValue=""
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                <option value="" disabled>
                  Select customer type
                </option>

                <option value="property_management">
                  Property Management
                </option>

                <option value="building_owner">
                  Building Owner
                </option>

                <option value="contractor">
                  Contractor
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="contact@example.com"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="text-sm font-semibold text-slate-700"
              >
                Phone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="415-555-1234"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="address_line_1"
                className="text-sm font-semibold text-slate-700"
              >
                Mailing Address
              </label>

              <input
                id="address_line_1"
                name="address_line_1"
                type="text"
                placeholder="123 Main Street"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="address_line_2"
                className="text-sm font-semibold text-slate-700"
              >
                Address Line 2
              </label>

              <input
                id="address_line_2"
                name="address_line_2"
                type="text"
                placeholder="Suite, unit, or floor"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="text-sm font-semibold text-slate-700"
              >
                City
              </label>

              <input
                id="city"
                name="city"
                type="text"
                placeholder="San Francisco"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="state"
                className="text-sm font-semibold text-slate-700"
              >
                State
              </label>

              <input
                id="state"
                name="state"
                type="text"
                defaultValue="CA"
                maxLength={2}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 uppercase text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="postal_code"
                className="text-sm font-semibold text-slate-700"
              >
                ZIP Code
              </label>

              <input
                id="postal_code"
                name="postal_code"
                type="text"
                placeholder="94102"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="notes"
                className="text-sm font-semibold text-slate-700"
              >
                Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Optional customer notes"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {error && (
            <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Customer"}
            </button>

            <Link
              href="/customers"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}