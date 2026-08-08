"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ExtractPermitButtonProps = {
  permitId: string;
  ocrStatus?: string | null;
};

export default function ExtractPermitButton({
  permitId,
  ocrStatus,
}: ExtractPermitButtonProps) {
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    setIsExtracting(true);
    setError(null);

    try {
      const response = await fetch(`/api/permits/${permitId}/ocr`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Permit extraction failed.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Permit extraction failed."
      );
    } finally {
      setIsExtracting(false);
    }
  }

  const isProcessing =
    isExtracting || ocrStatus === "processing";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleExtract}
        disabled={isProcessing}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? "Extracting..." : "Extract Permit"}
      </button>

      {error && (
        <p className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}