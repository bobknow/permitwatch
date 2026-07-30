import PropertyForm from "@/components/properties/PropertyForm";

export default function NewPropertyPage() {
  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-black mb-2">
        Add Property
      </h1>

      <p className="text-slate-600 mb-8">
        Create a new property to begin tracking boilers and permits.
      </p>

      <PropertyForm />
    </main>
  );
}