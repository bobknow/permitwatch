"use client";

import { useRef, useState } from "react";

type ExtractedImport = {
    permit_number: string | null;
    issued_date: string | null;
    inspection_date: string | null;
    expiration_date: string | null;

    property_name: string | null;
    address_line_1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;

    boiler_number: string | null;
    boiler_serial: string | null;
    boiler_model: string | null;
    boiler_manufacturer: string | null;
    boiler_type: string | null;

    pressure: number | null;

    inspector_name: string | null;
    inspector_firm: string | null;
    inspector_phone: string | null;

    notes: string | null;
    confidence: number | null;
};

type PropertyMatch = {
    id: string;
    property_name: string | null;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    state: string;
    postal_code: string;
    match_score: number;
};

type BoilerMatch = {
    id: string;
    property_id: string;
    boiler_number: string | null;
    model_number: string | null;
    serial_number: string | null;
    match_score: number;
};

type MatchResult = {
    propertyMatches: PropertyMatch[];
    boilerMatches: BoilerMatch[];
    suggestedProperty: PropertyMatch | null;
    suggestedBoiler: BoilerMatch | null;
};

const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
];

const maxFileSize = 25 * 1024 * 1024;

export default function PermitImportForm() {
    const fileInputRef =
        useRef<HTMLInputElement>(null);

    const [file, setFile] =
        useState<File | null>(null);

    const [dragging, setDragging] =
        useState(false);

    const [isReading, setIsReading] =
        useState(false);

    const [isMatching, setIsMatching] =
        useState(false);

    const [isSaving, setIsSaving] =
        useState(false);

    const [saveMessage, setSaveMessage] =
        useState<string | null>(null);

    const [error, setError] =
        useState<string | null>(null);

    const [extracted, setExtracted] =
        useState<ExtractedImport | null>(null);

    const [matchResult, setMatchResult] =
        useState<MatchResult | null>(null);

    const [
        selectedPropertyId,
        setSelectedPropertyId,
    ] = useState<string | null>(null);

    const [
        selectedBoilerId,
        setSelectedBoilerId,
    ] = useState<string | null>(null);

    const isWorking =
        isReading || isMatching || isSaving;

    function validateFile(
        selectedFile: File
    ) {
        if (
            !allowedTypes.includes(
                selectedFile.type
            )
        ) {
            setError(
                "Please select a PDF, JPG, JPEG, or PNG file."
            );

            return false;
        }

        if (
            selectedFile.size >
            maxFileSize
        ) {
            setError(
                "The file must be 25 MB or smaller."
            );

            return false;
        }

        return true;
    }

    function selectFile(
        selectedFile: File | undefined
    ) {
        if (
            !selectedFile ||
            !validateFile(selectedFile)
        ) {
            return;
        }

        setError(null);
        setExtracted(null);
        setMatchResult(null);
        setSelectedPropertyId(null);
        setSelectedBoilerId(null);
        setFile(selectedFile);
    }

    async function savePermit() {
        if (!file || !extracted) {
            setError("Read the permit before saving.");
            return;
        }

        setError(null);
        setSaveMessage(null);
        setIsSaving(true);

        try {
            const formData = new FormData();

            formData.append("file", file);

            formData.append(
                "extracted",
                JSON.stringify(extracted)
            );

            if (selectedPropertyId) {
                formData.append(
                    "selected_property_id",
                    selectedPropertyId
                );
            }

            if (selectedBoilerId) {
                formData.append(
                    "selected_boiler_id",
                    selectedBoilerId
                );
            }

            const response = await fetch(
                "/api/permits/import-save",
                {
                    method: "POST",
                    body: formData,
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to save permit."
                );
            }

            setSaveMessage(
                "Permit saved successfully."
            );

            window.location.href =
                `/properties/${result.property_id}/boilers/${result.boiler_id}`;
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to save permit."
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function readPermit() {
        if (!file) {
            setError(
                "Select a permit file first."
            );

            return;
        }

        setError(null);
        setIsReading(true);
        setExtracted(null);
        setMatchResult(null);
        setSelectedPropertyId(null);
        setSelectedBoilerId(null);

        try {
            const formData = new FormData();

            formData.append("file", file);

            const response = await fetch(
                "/api/permits/import-preview",
                {
                    method: "POST",
                    body: formData,
                }
            );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to read permit."
                );
            }

            setExtracted(
                result.extracted ?? null
            );
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to read permit."
            );
        } finally {
            setIsReading(false);
        }
    }

    async function findMatches() {
        if (!extracted?.address_line_1) {
            setError(
                "Enter the property street address before searching."
            );

            return;
        }

        setError(null);
        setIsMatching(true);
        setMatchResult(null);
        setSelectedPropertyId(null);
        setSelectedBoilerId(null);

        try {
            const response = await fetch(
                "/api/permits/import-match",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        address_line_1:
                            extracted.address_line_1,
                        city: extracted.city,
                        state: extracted.state,
                        postal_code:
                            extracted.postal_code,
                        boiler_number:
                            extracted.boiler_number,
                        boiler_serial:
                            extracted.boiler_serial,
                    }),
                }
            );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "Unable to search existing records."
                );
            }

            const matches =
                result as MatchResult;

            setMatchResult(matches);

            if (
                matches.suggestedProperty
            ) {
                setSelectedPropertyId(
                    matches.suggestedProperty.id
                );
            }

            if (
                matches.suggestedBoiler
            ) {
                setSelectedBoilerId(
                    matches.suggestedBoiler.id
                );
            }
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to search existing records."
            );
        } finally {
            setIsMatching(false);
        }
    }

    function updateExtracted<
        K extends keyof ExtractedImport,
    >(
        key: K,
        value: ExtractedImport[K]
    ) {
        if (!extracted) {
            return;
        }

        setExtracted({
            ...extracted,
            [key]: value,
        });

        setMatchResult(null);
        setSelectedPropertyId(null);
        setSelectedBoilerId(null);
    }

    function resetImport() {
        setFile(null);
        setDragging(false);
        setIsReading(false);
        setIsMatching(false);
        setError(null);
        setIsSaving(false);
        setSaveMessage(null);
        setExtracted(null);
        setMatchResult(null);
        setSelectedPropertyId(null);
        setSelectedBoilerId(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(event) =>
                        selectFile(
                            event.target.files?.[0]
                        )
                    }
                />

                <div
                    onDragEnter={(event) => {
                        event.preventDefault();

                        if (!isWorking) {
                            setDragging(true);
                        }
                    }}
                    onDragOver={(event) => {
                        event.preventDefault();

                        if (!isWorking) {
                            setDragging(true);
                        }
                    }}
                    onDragLeave={(event) => {
                        event.preventDefault();
                        setDragging(false);
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);

                        if (!isWorking) {
                            selectFile(
                                event.dataTransfer
                                    .files?.[0]
                            );
                        }
                    }}
                    className={`rounded-2xl border-2 border-dashed p-10 text-center transition md:p-16 ${dragging
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-300 bg-slate-50"
                        }`}
                >
                    <h2 className="text-2xl font-black text-slate-900">
                        Drop your permit here
                    </h2>

                    <p className="mt-3 text-slate-600">
                        PermitWatch will read the
                        document before creating any
                        records.
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                        PDF, JPG, JPEG, or PNG —
                        maximum 25 MB
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            fileInputRef.current?.click()
                        }
                        disabled={isWorking}
                        className="mt-6 rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Browse Files
                    </button>
                </div>

                {file && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm font-medium text-slate-500">
                            Selected file
                        </p>

                        <p className="mt-1 break-all font-semibold text-slate-900">
                            {file.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            {(
                                file.size /
                                1024 /
                                1024
                            ).toFixed(2)}{" "}
                            MB
                        </p>

                        {error && (
                            <p className="mt-4 font-medium text-red-600">
                                {error}
                            </p>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={readPermit}
                                disabled={isWorking}
                                className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isReading
                                    ? "Reading Permit..."
                                    : "Read Permit"}
                            </button>

                            <button
                                type="button"
                                onClick={resetImport}
                                disabled={isWorking}
                                className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {extracted && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                                OCR Preview
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-900">
                                Review extracted information
                            </h2>
                        </div>

                        {extracted.confidence !==
                            null && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                                    Confidence{" "}
                                    {Math.round(
                                        extracted.confidence *
                                        100
                                    )}
                                    %
                                </span>
                            )}
                    </div>

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <PreviewSection
                            title="Property"
                            fields={[
                                [
                                    "Property Name",
                                    extracted.property_name,
                                ],
                                [
                                    "Address",
                                    extracted.address_line_1,
                                ],
                                [
                                    "City",
                                    extracted.city,
                                ],
                                [
                                    "State",
                                    extracted.state,
                                ],
                                [
                                    "ZIP",
                                    extracted.postal_code,
                                ],
                            ]}
                        />

                        <PreviewSection
                            title="Boiler"
                            fields={[
                                [
                                    "Boiler Number",
                                    extracted.boiler_number,
                                ],
                                [
                                    "Serial Number",
                                    extracted.boiler_serial,
                                ],
                                [
                                    "Model Number",
                                    extracted.boiler_model,
                                ],
                                [
                                    "Manufacturer",
                                    extracted.boiler_manufacturer,
                                ],
                                [
                                    "Type",
                                    extracted.boiler_type,
                                ],
                            ]}
                        />

                        <PreviewSection
                            title="Permit"
                            fields={[
                                [
                                    "Permit Number",
                                    extracted.permit_number,
                                ],
                                [
                                    "Issued",
                                    extracted.issued_date,
                                ],
                                [
                                    "Inspection",
                                    extracted.inspection_date,
                                ],
                                [
                                    "Expiration",
                                    extracted.expiration_date,
                                ],
                                [
                                    "Pressure",
                                    extracted.pressure !==
                                        null
                                        ? String(
                                            extracted.pressure
                                        )
                                        : null,
                                ],
                            ]}
                        />

                        <PreviewSection
                            title="Inspector"
                            fields={[
                                [
                                    "Name",
                                    extracted.inspector_name,
                                ],
                                [
                                    "Firm",
                                    extracted.inspector_firm,
                                ],
                                [
                                    "Phone",
                                    extracted.inspector_phone,
                                ],
                                [
                                    "Notes",
                                    extracted.notes,
                                ],
                            ]}
                        />
                    </div>

                    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-lg font-black text-slate-900">
                            Confirm Property Information
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                            Complete or correct anything
                            PermitWatch could not read from
                            the permit.
                        </p>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <EditableField
                                label="Property Name"
                                value={
                                    extracted.property_name ??
                                    ""
                                }
                                onChange={(value) =>
                                    updateExtracted(
                                        "property_name",
                                        value || null
                                    )
                                }
                            />

                            <EditableField
                                label="Street Address"
                                value={
                                    extracted.address_line_1 ??
                                    ""
                                }
                                onChange={(value) =>
                                    updateExtracted(
                                        "address_line_1",
                                        value || null
                                    )
                                }
                            />

                            <EditableField
                                label="City"
                                value={
                                    extracted.city ?? ""
                                }
                                onChange={(value) =>
                                    updateExtracted(
                                        "city",
                                        value || null
                                    )
                                }
                            />

                            <EditableField
                                label="State"
                                value={
                                    extracted.state ?? ""
                                }
                                maxLength={2}
                                onChange={(value) =>
                                    updateExtracted(
                                        "state",
                                        value.toUpperCase() ||
                                        null
                                    )
                                }
                            />

                            <EditableField
                                label="ZIP Code"
                                value={
                                    extracted.postal_code ??
                                    ""
                                }
                                onChange={(value) =>
                                    updateExtracted(
                                        "postal_code",
                                        value || null
                                    )
                                }
                            />

                            <EditableField
                                label="Boiler Number"
                                value={
                                    extracted.boiler_number ??
                                    ""
                                }
                                onChange={(value) =>
                                    updateExtracted(
                                        "boiler_number",
                                        value || null
                                    )
                                }
                            />

                            <EditableField
                                label="Serial Number"
                                value={
                                    extracted.boiler_serial ??
                                    ""
                                }
                                onChange={(value) =>
                                    updateExtracted(
                                        "boiler_serial",
                                        value || null
                                    )
                                }
                            />

                            <EditableField
                                label="Model Number"
                                value={
                                    extracted.boiler_model ??
                                    ""
                                }
                                onChange={(value) =>
                                    updateExtracted(
                                        "boiler_model",
                                        value || null
                                    )
                                }
                            />
                        </div>

                        <button
                            type="button"
                            onClick={findMatches}
                            disabled={
                                isMatching ||
                                !extracted.address_line_1
                            }
                            className="mt-6 rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isMatching
                                ? "Searching..."
                                : "Find Existing Property"}
                        </button>
                    </div>

                    {matchResult && (
                        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
                            <h3 className="text-lg font-black text-slate-900">
                                Property Match
                            </h3>

                            {matchResult
                                .propertyMatches.length >
                                0 ? (
                                <div className="mt-4 space-y-3">
                                    {matchResult.propertyMatches.map(
                                        (property) => (
                                            <label
                                                key={property.id}
                                                className={`block cursor-pointer rounded-xl border p-4 transition ${selectedPropertyId ===
                                                    property.id
                                                    ? "border-emerald-500 bg-emerald-50"
                                                    : "border-slate-200 hover:border-slate-400"
                                                    }`}
                                            >
                                                <div className="flex gap-3">
                                                    <input
                                                        type="radio"
                                                        name="property_match"
                                                        checked={
                                                            selectedPropertyId ===
                                                            property.id
                                                        }
                                                        onChange={() => {
                                                            setSelectedPropertyId(
                                                                property.id
                                                            );

                                                            setSelectedBoilerId(
                                                                null
                                                            );
                                                        }}
                                                    />

                                                    <div>
                                                        <p className="font-bold text-slate-900">
                                                            {property.property_name ||
                                                                property.address_line_1}
                                                        </p>

                                                        <p className="mt-1 text-sm text-slate-600">
                                                            {
                                                                property.address_line_1
                                                            }
                                                            {property.city
                                                                ? `, ${property.city}`
                                                                : ""}
                                                            {property.state
                                                                ? `, ${property.state}`
                                                                : ""}{" "}
                                                            {
                                                                property.postal_code
                                                            }
                                                        </p>

                                                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                                            Match{" "}
                                                            {
                                                                property.match_score
                                                            }
                                                            %
                                                        </p>
                                                    </div>
                                                </div>
                                            </label>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <p className="font-bold text-amber-900">
                                        No existing property
                                        found.
                                    </p>

                                    <p className="mt-1 text-sm text-amber-800">
                                        PermitWatch can create
                                        this property after you
                                        complete the required
                                        address information.
                                    </p>
                                </div>
                            )}

                            {selectedPropertyId &&
                                matchResult.boilerMatches.filter(
                                    (boiler) =>
                                        boiler.property_id ===
                                        selectedPropertyId
                                ).length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="font-black text-slate-900">
                                            Boiler Match
                                        </h4>

                                        <div className="mt-3 space-y-3">
                                            {matchResult.boilerMatches
                                                .filter(
                                                    (boiler) =>
                                                        boiler.property_id ===
                                                        selectedPropertyId
                                                )
                                                .map(
                                                    (boiler) => (
                                                        <label
                                                            key={
                                                                boiler.id
                                                            }
                                                            className={`block cursor-pointer rounded-xl border p-4 transition ${selectedBoilerId ===
                                                                boiler.id
                                                                ? "border-emerald-500 bg-emerald-50"
                                                                : "border-slate-200 hover:border-slate-400"
                                                                }`}
                                                        >
                                                            <div className="flex gap-3">
                                                                <input
                                                                    type="radio"
                                                                    name="boiler_match"
                                                                    checked={
                                                                        selectedBoilerId ===
                                                                        boiler.id
                                                                    }
                                                                    onChange={() =>
                                                                        setSelectedBoilerId(
                                                                            boiler.id
                                                                        )
                                                                    }
                                                                />

                                                                <div>
                                                                    <p className="font-bold text-slate-900">
                                                                        Boiler #
                                                                        {boiler.boiler_number ||
                                                                            "Unknown"}
                                                                    </p>

                                                                    <p className="mt-1 text-sm text-slate-600">
                                                                        Serial:{" "}
                                                                        {boiler.serial_number ||
                                                                            "Not recorded"}
                                                                    </p>

                                                                    {boiler.model_number && (
                                                                        <p className="mt-1 text-sm text-slate-600">
                                                                            Model:{" "}
                                                                            {
                                                                                boiler.model_number
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    )
                                                )}
                                        </div>
                                    </div>
                                )}

                            {selectedPropertyId && (
                                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                    <p className="font-bold text-emerald-900">
                                        Property selected
                                    </p>

                                    <p className="mt-1 text-sm text-emerald-800">
                                        {selectedBoilerId
                                            ? "An existing property and boiler are ready to receive this permit."
                                            : "The property is selected. If no matching boiler exists, PermitWatch will be able to create one in the next step."}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-lg font-black text-slate-900">
                            Save Permit
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                            PermitWatch will use the selected property and boiler when available,
                            or create the missing records from the reviewed information.
                        </p>

                        {error && (
                            <p className="mt-4 font-medium text-red-600">
                                {error}
                            </p>
                        )}

                        {saveMessage && (
                            <p className="mt-4 font-medium text-emerald-700">
                                {saveMessage}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={savePermit}
                            disabled={
                                isWorking ||
                                !extracted.address_line_1
                            }
                            className="mt-5 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving
                                ? "Saving Permit..."
                                : "Save Permit"}
                        </button>
                    </div>

                    <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
                        <p className="font-bold text-amber-900">
                            Nothing has been saved yet.
                        </p>

                        <p className="mt-2 text-sm leading-6 text-amber-800">
                            Review the extracted
                            information and match the
                            permit to an existing
                            property and boiler. The next
                            step will create any missing
                            records and save the permit.
                        </p>
                    </div>
                </section>
            )}
        </div>
    );
}

function PreviewSection({
    title,
    fields,
}: {
    title: string;
    fields: [
        string,
        string | null
    ][];
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-900">
                {title}
            </h3>

            <dl className="mt-4 space-y-3">
                {fields.map(
                    ([label, value]) => (
                        <div key={label}>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {label}
                            </dt>

                            <dd className="mt-1 break-words font-semibold text-slate-900">
                                {value ||
                                    "Not detected"}
                            </dd>
                        </div>
                    )
                )}
            </dl>
        </div>
    );
}

function EditableField({
    label,
    value,
    onChange,
    maxLength,
}: {
    label: string;
    value: string;
    onChange: (
        value: string
    ) => void;
    maxLength?: number;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
                {label}
            </label>

            <input
                type="text"
                value={value}
                maxLength={maxLength}
                onChange={(event) =>
                    onChange(
                        event.target.value
                    )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500"
            />
        </div>
    );
}