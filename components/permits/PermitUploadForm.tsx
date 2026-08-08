"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PermitUploadFormProps = {
  propertyId: string;
  boilerId: string;
};

type UploadStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "complete";

const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const maxFileSize = 25 * 1024 * 1024;

export default function PermitUploadForm({
  propertyId,
  boilerId,
}: PermitUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const isWorking =
    stage === "uploading" || stage === "extracting";

  function validateFile(selectedFile: File) {
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please select a PDF, JPG, JPEG, or PNG file.");
      return false;
    }

    if (selectedFile.size > maxFileSize) {
      setError("The file must be 25 MB or smaller.");
      return false;
    }

    return true;
  }

  function selectFile(selectedFile: File | undefined) {
    if (!selectedFile || !validateFile(selectedFile)) {
      return;
    }

    setError(null);
    setFile(selectedFile);
  }

  async function uploadPermit() {
    if (!file) {
      setError("Select a permit file first.");
      return;
    }

    setError(null);
    setStage("uploading");

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("property_id", propertyId);
      formData.append("boiler_id", boilerId);

      const uploadResponse = await fetch("/api/permits/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(
          uploadResult.error || "Unable to upload permit."
        );
      }

      const permitId = uploadResult.permit?.id;

      if (!permitId) {
        throw new Error(
          "The permit uploaded, but no permit ID was returned."
        );
      }

      setStage("extracting");

      const ocrResponse = await fetch(
        `/api/permits/${permitId}/ocr`,
        {
          method: "POST",
        }
      );

      const ocrResult = await ocrResponse.json();

      if (!ocrResponse.ok) {
        throw new Error(
          ocrResult.error ||
            "The permit uploaded, but automatic extraction failed."
        );
      }

      setStage("complete");

      router.push(
        `/properties/${propertyId}/boilers/${boilerId}`
      );

      router.refresh();
    } catch (error) {
      setStage("idle");

      setError(
        error instanceof Error
          ? error.message
          : "Unable to process permit."
      );
    }
  }

  function buttonText() {
    if (stage === "uploading") {
      return "Uploading...";
    }

    if (stage === "extracting") {
      return "Reading Permit...";
    }

    if (stage === "complete") {
      return "Complete";
    }

    return "Upload Permit";
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(event) =>
          selectFile(event.target.files?.[0])
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
            selectFile(event.dataTransfer.files?.[0]);
          }
        }}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition md:p-16 ${
          dragging
            ? "border-slate-900 bg-slate-100"
            : "border-slate-300 bg-slate-50"
        }`}
      >
        <h2 className="text-2xl font-black text-slate-900">
          Upload Permit
        </h2>

        <p className="mt-3 text-slate-600">
          Drag and drop a permit document here.
        </p>

        <p className="mt-2 text-sm text-slate-500">
          PDF, JPG, JPEG, or PNG — maximum 25 MB
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
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
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>

          {stage === "extracting" && (
            <p className="mt-4 font-semibold text-slate-700">
              Reading permit information and updating the boiler...
            </p>
          )}

          {error && (
            <p className="mt-4 font-medium text-red-600">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={uploadPermit}
              disabled={isWorking}
              className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {buttonText()}
            </button>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setError(null);
                setStage("idle");

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              disabled={isWorking}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}