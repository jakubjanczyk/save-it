"use client";

export function LinkExtractionErrorBanner() {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm">
      Link extraction failed for this email.
    </div>
  );
}
