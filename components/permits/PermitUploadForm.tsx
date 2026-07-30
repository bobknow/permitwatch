"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PermitUploadFormProps = {
  propertyId: string;
  boilerId: string;
};

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
  const [uploading, setUploading] = useState(false);

  function validateFile(selectedFile: File) {
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Please select a PDF, JPG, JPEG, or PNG file.");
      return false;
    }

    if (selectedFile.size > maxFileSize) {
      alert("The file must be 25 MB or smaller.");
      return false;
    }

    return true;
  }

  function selectFile(selectedFile: File | undefined) {
    if (!selectedFile || !validateFile(selectedFile)) {
      return;
    }

    setFile(selectedFile);
  }

  async function uploadPermit() {
    if (!file) {
      alert("Select a permit file first.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("property_id", propertyId);
      formData.append("boiler_id", boilerId);

      const response = await fetch("/api/permits/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to upload permit."
        );
      }

      router.push(
        `/properties/${propertyId}/boilers/${boilerId}`
      );
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to upload permit."
      );
    } finally {
      setUploading(false);
    }
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
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFile(event.dataTransfer.files?.[0]);
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
          className="mt-6 rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
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

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={uploadPermit}
              disabled={uploading}
              className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload Permit"}
            </button>

            <button
              type="button"
              onClick={() => setFile(null)}
              disabled={uploading}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}