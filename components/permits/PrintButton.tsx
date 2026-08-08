"use client";

type PrintButtonProps = {
  className?: string;
};

export default function PrintButton({
  className,
}: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className}
    >
      Print
    </button>
  );
}