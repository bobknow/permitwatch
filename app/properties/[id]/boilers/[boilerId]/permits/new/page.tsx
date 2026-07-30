import Link from "next/link";
import { notFound } from "next/navigation";
import PermitUploadForm from "@/components/permits/PermitUploadForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/currentProfile";

type NewPermitPageProps = {
  params: Promise<{
    id: string;
    boilerId: string;
  }>;
};

export default async function NewPermitPage({
  params,
}: NewPermitPageProps) {
  const { id, boilerId } = await params;

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile?.tenant_id) {
    notFound();
  }

  const { data: boiler, error } = await supabase
    .from("boilers")
    .select(`
      id,
      property_id,
      boiler_number
    `)
    .eq("id", boilerId)
    .eq("property_id", id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (error || !boiler) {
    notFound();
  }

  return (
    <main className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/properties/${id}/boilers/${boilerId}`}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          ← Back to Boiler #{boiler.boiler_number}
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-black text-slate-900">
            Upload Permit
          </h1>

          <p className="mt-2 text-slate-600">
            Upload the current permit for Boiler #
            {boiler.boiler_number}.
          </p>
        </div>

        <div className="mt-8">
          <PermitUploadForm
            propertyId={id}
            boilerId={boilerId}
          />
        </div>
      </div>
    </main>
  );
}