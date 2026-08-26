import Link from "next/link";

export default function HelpPage() {
    return (
        <main className="p-6 md:p-10">
            <div className="mx-auto max-w-5xl">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                        PermitWatch Help Center
                    </p>

                    <h1 className="mt-2 text-4xl font-black text-slate-900">
                        How to use PermitWatch
                    </h1>

                    <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                        Manage properties, boilers, permits, documents,
                        expiration dates, and compliance records from one place.
                    </p>
                </div>

                <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <h2 className="text-2xl font-black text-slate-900">
                        Getting Started
                    </h2>

                    <div className="mt-6 space-y-6">
                        <Step
                            number="1"
                            title="Upload a permit"
                            text="Open Permits and choose Import Permit. Upload a PDF, JPG, JPEG, or PNG permit document."
                        />

                        <Step
                            number="2"
                            title="Review the permit information"
                            text="PermitWatch reads the document and extracts available permit, property, boiler, inspection, and expiration information."
                        />

                        <Step
                            number="3"
                            title="Complete missing property information"
                            text="Some permits may not contain the city, state, ZIP code, or other property details. Review the extracted information and complete any required fields."
                        />

                        <Step
                            number="4"
                            title="Match existing records"
                            text="PermitWatch searches your account for an existing property and boiler so duplicate records are not created."
                        />

                        <Step
                            number="5"
                            title="Save the permit"
                            text="If the property or boiler does not exist, PermitWatch can create the missing records from the information you reviewed and save the permit document."
                        />

                        <Step
                            number="6"
                            title="Monitor compliance"
                            text="Use your dashboard and property records to monitor current permits, expiration dates, permit history, and compliance status."
                        />
                    </div>
                </section>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <h2 className="text-2xl font-black text-slate-900">
                        Frequently Asked Questions
                    </h2>

                    <div className="mt-6 divide-y divide-slate-200">
                        <Faq
                            question="What file types can I upload?"
                            answer="PermitWatch accepts PDF, JPG, JPEG, and PNG permit documents up to 25 MB."
                        />

                        <Faq
                            question="Do I need to create the property before uploading a permit?"
                            answer="No. You can import the permit first. PermitWatch reads the document, searches for an existing property and boiler, and can create missing records after you review the information."
                        />

                        <Faq
                            question="What happens if the property already exists?"
                            answer="PermitWatch searches your organization's existing records and allows you to associate the permit with the matching property rather than creating a duplicate."
                        />

                        <Faq
                            question="What if the permit does not show the city, state, or ZIP code?"
                            answer="Enter the missing information during the review step before saving the permit."
                        />

                        <Faq
                            question="Can I keep previous permits?"
                            answer="Yes. PermitWatch maintains permit history when a newer permit is uploaded for a boiler."
                        />

                        <Faq
                            question="Can I view or download the original permit?"
                            answer="Yes. Stored permit documents can be viewed, downloaded, or printed from the boiler's permit record."
                        />

                        <Faq
                            question="Can I manage multiple boilers at one property?"
                            answer="Yes. A property can contain multiple boiler records, each with its own permit and compliance history."
                        />

                        <Faq
                            question="How does PermitWatch determine compliance status?"
                            answer="PermitWatch uses the permit expiration date to show whether a permit is current, approaching expiration, or expired."
                        />

                        <Faq
                            question="Can I delete a boiler?"
                            answer="Yes. Open the boiler record and use the Delete Boiler option. Review the warning carefully before confirming deletion."
                        />

                        <Faq
                            question="Where can I get help?"
                            answer="Contact PermitWatch at info@getpermitwatch.com for account questions, product questions, or general assistance."
                        />
                    </div>
                </section>

                <section className="mt-8 rounded-2xl bg-slate-950 p-6 text-white shadow-sm md:p-8">
                    <h2 className="text-2xl font-black">
                        Still need help?
                    </h2>

                    <p className="mt-3 text-slate-300">
                        Contact the PermitWatch team and we'll help you
                        with your account or compliance workflow.
                    </p>

                    <a
                        href="mailto:info@getpermitwatch.com"
                        className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-500"
                    >
                        Contact PermitWatch
                    </a>

                    <Link
                        href="/dashboard"
                        className="ml-3 mt-6 inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
                    >
                        Back to Dashboard
                    </Link>
                </section>
            </div>
        </main>
    );
}

function Step({
    number,
    title,
    text,
}: {
    number: string;
    title: string;
    text: string;
}) {
    return (
        <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-black text-white">
                {number}
            </div>

            <div>
                <h3 className="font-black text-slate-900">
                    {title}
                </h3>

                <p className="mt-1 leading-7 text-slate-600">
                    {text}
                </p>
            </div>
        </div>
    );
}

function Faq({
    question,
    answer,
}: {
    question: string;
    answer: string;
}) {
    return (
        <div className="py-5 first:pt-0 last:pb-0">
            <h3 className="font-black text-slate-900">
                {question}
            </h3>

            <p className="mt-2 leading-7 text-slate-600">
                {answer}
            </p>
        </div>
    );
}