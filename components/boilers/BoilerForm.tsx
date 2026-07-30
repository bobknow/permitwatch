"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BoilerFormProps = {
  propertyId: string;
};

export default function BoilerForm({
  propertyId,
}: BoilerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    boiler_number: "",
    model_number: "",
    serial_number: "",
  });

  async function submit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/boilers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          property_id: propertyId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.error || "Unable to save boiler."
        );
      }

      router.push(`/properties/${propertyId}`);
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to save boiler."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClasses =
    "mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200";

  const labelClasses =
    "block text-sm font-semibold text-slate-800";

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div>
  <label
    htmlFor="boiler_number"
    className={labelClasses}
  >
    Boiler Number
  </label>

  <select
    id="boiler_number"
    required
    className={inputClasses}
    value={form.boiler_number}
    onChange={(e) =>
      setForm({
        ...form,
        boiler_number: e.target.value,
      })
    }
  >
    <option value="">Select boiler number</option>

    {Array.from({ length: 99 }, (_, index) => {
      const boilerNumber = index + 1;

      return (
        <option
          key={boilerNumber}
          value={String(boilerNumber)}
        >
          Boiler #{boilerNumber}
        </option>
      );
    })}
  </select>
</div>

      <div>
        <label
          htmlFor="model_number"
          className={labelClasses}
        >
          Model Number
        </label>

        <input
          id="model_number"
          className={inputClasses}
          value={form.model_number}
          onChange={(e) =>
            setForm({
              ...form,
              model_number: e.target.value,
            })
          }
        />
      </div>

      <div>
        <label
          htmlFor="serial_number"
          className={labelClasses}
        >
          Serial Number
        </label>

        <input
          id="serial_number"
          className={inputClasses}
          value={form.serial_number}
          onChange={(e) =>
            setForm({
              ...form,
              serial_number: e.target.value,
            })
          }
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Boiler"}
        </button>
      </div>
    </form>
  );
}