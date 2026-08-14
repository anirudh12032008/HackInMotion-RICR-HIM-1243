"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface CitySearchResult {
  name: string;
  lat: number;
  lng: number;
}

/**
 * Debounced city search with a dropdown of matches, backed by
 * /api/aqi/search (Google Geocoding)  previously unused by any component
 * even though the route existed.
 */
export function CitySearchInput({
  placeholder,
  value,
  onSelect,
  onClear,
  disabled,
}: {
  placeholder: string;
  value: string | null;
  onSelect: (result: CitySearchResult) => void;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/aqi/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(res.ok ? data.results ?? [] : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleSelect(result: CitySearchResult) {
    onSelect(result);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{value}</span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
