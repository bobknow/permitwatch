"use client";

import { useState } from "react";

import { deleteBoiler } from "@/app/actions/delete";

type DeleteBoilerButtonProps = {
  boilerId: string;
  boilerNumber: string | number | null;
};

export default function DeleteBoilerButton({
  boilerId,
  boilerNumber,
}: DeleteBoilerButtonProps) {
  const [showConfirm, setShowConfirm] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteBoiler(boilerId);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete boiler."
      );

      setIsDeleting(false);
    }
  }

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500"
      >
        Delete Boiler
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="font-bold text-red-900">
        Delete Boiler
        {boilerNumber
          ? ` #${boilerNumber}`
          : ""}
        ?
      </p>

      <p className="mt-2 text-sm text-red-700">
        This boiler can only be deleted if it has no
        permit history.
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
          {isDeleting
            ? "Deleting..."
            : "Confirm Delete"}
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