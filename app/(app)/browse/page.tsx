import { BrowseClient } from "./page-client";

export default function BrowsePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <BrowseClient />
    </div>
  );
}
