import BoilerForm from "@/components/boilers/BoilerForm";

type NewBoilerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewBoilerPage({
  params,
}: NewBoilerPageProps) {
  const { id } = await params;

  return (
    <main className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-black text-slate-900">
          Add Boiler
        </h1>

        <p className="mt-2 text-slate-600">
          Add boiler details for this property.
        </p>

        <div className="mt-8">
          <BoilerForm propertyId={id} />
        </div>
      </div>
    </main>
  );
}