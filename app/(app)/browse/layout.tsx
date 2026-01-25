import type { ReactNode } from "react";

import { BrowseHeader } from "./browse-header";

export default function BrowseLayout(props: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <BrowseHeader />
      {props.children}
    </div>
  );
}
