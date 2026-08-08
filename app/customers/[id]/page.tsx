import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";

type CustomerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCustomerType(customerType: string) {
  return customerType
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    notFound();
  }

  const { data: customer, error: customerError } =
    await supabase
      .from("customers")
      .select(`
        id,
        name,
        customer_type,
        contact_name,
        email,
        phone,
        address_line_1,
        address_line_2,
        city,
        state,
        postal_code,
        notes,
        is_active,
        created_at
      `)
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .single();

  if (customerError || !customer) {
    console.error(
      "Unable to load customer:",
      customerError
    );

    notFound();
  }

  const mailingAddress = [
    customer.address_line_1,
    customer.address_line_2,
    customer.city,
    customer.state,
    customer.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/customers"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to Customers
        </Link>

        <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </p>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  customer.is_active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {customer.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <h1 className="mt-2 text-4xl font-black text-slate-900">
              {customer.name}
            </h1>

            <p className="mt-2 text-slate-600">
              {formatCustomerType(customer.customer_type)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/customers/${customer.id}/edit`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Edit Customer
            </Link>

            <Link
              href={`/properties/new?customerId=${customer.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Add Property
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Properties
            </p>

            <p className="mt-3 text-4xl font-black text-slate-900">
              0
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Boilers
            </p>

            <p className="mt-3 text-4xl font-black text-slate-900">
              0
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Current
            </p>

            <p className="mt-3 text-4xl font-black text-emerald-700">
              0
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Attention Needed
            </p>

            <p className="mt-3 text-4xl font-black text-amber-700">
              0
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-black text-slate-900">
            Contact Information
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Primary Contact
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {customer.contact_name || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">
                Customer Type
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatCustomerType(customer.customer_type)}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">
                Email
              </p>

              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="mt-1 inline-block font-semibold text-slate-900 hover:underline"
                >
                  {customer.email}
                </a>
              ) : (
                <p className="mt-1 font-semibold text-slate-900">
                  Not provided
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">
                Phone
              </p>

              {customer.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                  className="mt-1 inline-block font-semibold text-slate-900 hover:underline"
                >
                  {customer.phone}
                </a>
              ) : (
                <p className="mt-1 font-semibold text-slate-900">
                  Not provided
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <p className="text-sm font-medium text-slate-500">
                Mailing Address
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {mailingAddress || "Not provided"}
              </p>
            </div>

            {customer.notes && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-slate-500">
                  Notes
                </p>

                <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-900">
                  {customer.notes}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Properties
              </h2>

              <p className="mt-2 text-slate-600">
                Properties connected to this customer.
              </p>
            </div>

            <Link
              href={`/properties/new?customerId=${customer.id}`}
              className="inline-flex w-fit items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Add Property
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <h3 className="text-xl font-bold text-slate-900">
              No properties yet
            </h3>

            <p className="mt-3 text-slate-600">
              Add the first property for this customer.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}