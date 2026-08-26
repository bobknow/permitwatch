import PermitImportForm from "@/components/permits/PermitImportForm";

export default function PermitImportPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Permit Import
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900">
            Upload a Permit
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Upload a boiler permit and PermitWatch will
            read the property, boiler, permit, and
            expiration information for you.
          </p>
        </div>

        <div className="mt-8">
          <PermitImportForm />
        </div>
      </div>
    </main>
  );
}