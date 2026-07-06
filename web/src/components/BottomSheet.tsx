"use client";

import { useState } from "react";

interface BottomSheetProps {
  children: React.ReactNode;
}

export function BottomSheet({ children }: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`animate-sheet fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-white shadow-lg transition-all lg:hidden ${
        expanded ? "top-24" : "max-h-56"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-center py-3"
        aria-label={expanded ? "Collapse panel" : "Expand panel"}
      >
        <div className="h-1 w-10 rounded-full bg-stone-300" />
      </button>
      <div className="overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}
