import { BrowseHeaderControls } from "./browse-header-controls";

export function BrowseHeader() {
  return (
    <div className="flex items-center justify-between gap-2">
      <h1 className="font-semibold text-xl">Browse Saved Links</h1>
      <BrowseHeaderControls />
    </div>
  );
}
