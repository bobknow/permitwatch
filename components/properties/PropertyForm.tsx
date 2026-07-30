"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "CA",
    zip: "",
    notes: "",
  });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error?.message || result.error || "Unable to save property.");
      }

      router.push("/properties");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save property.");
    } finally {
      setLoading(false);
    }
  }

  const inputClasses =
    "mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200";

  const labelClasses = "block text-sm font-semibold text-slate-800";

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm md:p-8"
    >
      <div>
        <label htmlFor="property-name" className={labelClasses}>
          Property Name
        </label>

        <input
          id="property-name"
          required
          className={inputClasses}
          placeholder="Example: Market Street Apartments"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="address" className={labelClasses}>
          Street Address
        </label>

        <input
          id="address"
          required
          className={inputClasses}
          placeholder="123 Market Street"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="city" className={labelClasses}>
            City
          </label>

          <input
            id="city"
            required
            className={inputClasses}
            placeholder="San Francisco"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="state" className={labelClasses}>
            State
          </label>

          <input
            id="state"
            required
            maxLength={2}
            className={inputClasses}
            value={form.state}
            onChange={(e) =>
              setForm({
                ...form,
                state: e.target.value.toUpperCase(),
              })
            }
          />
        </div>

        <div>
          <label htmlFor="zip" className={labelClasses}>
            ZIP Code
          </label>

          <input
            id="zip"
            required
            inputMode="numeric"
            maxLength={10}
            className={inputClasses}
            placeholder="94102"
            value={form.zip}
            onChange={(e) => setForm({ ...form, zip: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={labelClasses}>
          Notes
        </label>

        <textarea
          id="notes"
          rows={5}
          className={inputClasses}
          placeholder="Optional property notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Property"}
        </button>
      </div>
    </form>
  );
}