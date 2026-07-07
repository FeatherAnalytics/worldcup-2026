import { useMemo, useRef, useState } from "react";

interface ClubInfo {
  club: string;
  count: number;
  teams: number;
}

interface ClubComboboxProps {
  clubs: ClubInfo[];
  selected: string;
  onChange: (club: string) => void;
}

export function ClubCombobox({ clubs, selected, onChange }: ClubComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return clubs.slice(0, 10);
    const q = query.toLowerCase();
    return clubs.filter((c) => c.club.toLowerCase().includes(q)).slice(0, 20);
  }, [clubs, query]);

  if (selected) {
    const info = clubs.find((c) => c.club === selected);
    return (
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
          Club
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
          <span className="flex-1 text-[13px] text-stone-700">{selected}</span>
          {info && (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] text-stone-500">
              {info.count}
            </span>
          )}
          <button
            onClick={() => { onChange(""); setQuery(""); }}
            className="text-stone-400 hover:text-stone-600"
            aria-label="Clear club selection"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        Club
      </div>
      <div className={`flex items-center gap-2 rounded-lg border bg-stone-50 px-3 py-2 transition-colors ${open ? "border-[#4A7FB5] ring-1 ring-[#4A7FB5]/10" : "border-stone-200"}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search clubs..."
          className="flex-1 bg-transparent text-[13px] text-stone-700 outline-none placeholder:text-stone-400"
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-stone-400">No clubs found</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.club}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(c.club); setQuery(""); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-stone-700 hover:bg-stone-50"
              >
                <span>{c.club}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
                  {c.count} players
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
