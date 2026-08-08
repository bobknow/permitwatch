"use client";

import { useState } from "react";

import { deleteProperty } from "@/app/actions/delete";

type DeletePropertyButtonProps = {
  propertyId: string;
  propertyName: string;
};

export default function DeletePropertyButton({
  propertyId,
  propertyName,
}: DeletePropertyButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteProperty(propertyId);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete property."
      );

      setIsDeleting(false);
    }
  }

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50"
      >
        Delete Property
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="font-bold text-red-900">
        Delete {propertyName}?
      </p>

      <p className="mt-2 text-sm text-red-700">
        This property can only be deleted if it has no boilers.
      </p>

      {error && (
        <p className="mt-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Deleting..." : "Confirm Delete"}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowConfirm(false);
            setError(null);
          }}
          disabled={isDeleting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}