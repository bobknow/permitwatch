import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PropertyCard from "@/components/properties/PropertyCard";

export default async function PropertiesPage() {
  const supabase = await createClient();

  const { data: properties, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load properties:", error);
  }

  return (
    <main className="p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Properties
          </h1>

          <p className="mt-1 text-slate-600">
            Manage buildings, boilers, and permit records.
          </p>
        </div>

        <Link
          href="/properties/new"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
        >
          Add Property
        </Link>
      </div>

      {properties && properties.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            No properties yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-slate-600">
            Add your first property to begin tracking boilers and permit
            expiration dates.
          </p>

          <Link
            href="/properties/new"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Add First Property
          </Link>
        </div>
      )}
    </main>
  );
}