import Link from "next/link";
import { Property } from "@/types/Property";

export default function PropertyCard({
  property,
}: {
  property: Property;
}) {
  return (
    <Link
      href={`/properties/${property.id}`}
      className="block rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-500"
    >
      <h2 className="text-2xl font-black">
        {property.property_name ??
          property.address_line_1}
      </h2>

      <p className="mt-2 text-slate-400">
        {property.address_line_1}
      </p>

      <div className="mt-6 flex justify-between">

        <span className="text-sm text-slate-500">
          {property.city}
        </span>

        <span className="font-bold text-emerald-400">
          View →
        </span>

      </div>
    </Link>
  );
}