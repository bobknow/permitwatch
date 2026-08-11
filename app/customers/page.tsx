import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/currentProfile";
import { createClient } from "@/lib/supabase/server";

function formatCustomerType(customerType: string) {
  return customerType
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

export default async function CustomersPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    redirect("/login?next=/customers");
  }

  const { data: customers, error } =
    await supabase
      .from("customers")
      .select(`
        id,
        name,
        customer_type,
        contact_name,
        email,
        phone,
        city,
        state,
        is_active,
        created_at
      `)
      .eq("tenant_id", profile.tenant_id)
      .order("name", { ascending: true });

  if (error) {
    console.error(
      "Unable to load customers:",
      error
    );
  }

  const customerList = customers ?? [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Customers
            </h1>

            <p className="mt-2 text-slate-600">
              Manage building owners, property
              managers, and organizations.
            </p>
          </div>

          <Link
            href="/customers/new"
            className="inline-flex w-fit items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Add Customer
          </Link>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900">
              Customer List
            </h2>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              {customerList.length}{" "}
              {customerList.length === 1
                ? "Customer"
                : "Customers"}
            </span>
          </div>

          {customerList.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
              <h3 className="text-xl font-bold text-slate-900">
                No customers yet
              </h3>

              <p className="mt-3 text-slate-600">
                Add your first customer to begin
                managing properties and boiler
                compliance.
              </p>

              <Link
                href="/customers/new"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                Add First Customer
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {customerList.map((customer) => {
                const location = [
                  customer.city,
                  customer.state,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <Link
                    key={customer.id}
                    href={`/customers/${customer.id}`}
                    className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold text-slate-900">
                            {customer.name}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              customer.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {customer.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-medium text-slate-600">
                          {formatCustomerType(
                            customer.customer_type
                          )}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          {customer.contact_name ||
                            customer.email ||
                            customer.phone ||
                            location ||
                            "No contact information provided"}
                        </p>
                      </div>

                      <span className="font-semibold text-slate-700">
                        View Customer →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}