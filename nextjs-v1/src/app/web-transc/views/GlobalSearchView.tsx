"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, X, ArrowLeft } from "lucide-react";
import { useGlobalSearchStore } from "../store/useGlobalSearchStore";
import { useTranscripts } from "../hooks/useTranscripts";
import { useRouterStore } from "../store/useRouterStore";
import { GlobalSearchAccordion } from "../components/GlobalSearchAccordion";
import { cn } from "@/lib/utils";

// Debounce helper
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface GlobalSearchViewProps {
  q?: string;
}

export default function GlobalSearchView({ q }: GlobalSearchViewProps) {
  const { navigate, replace } = useRouterStore();
  const { transcripts } = useTranscripts();
  const {
    results,
    totalMatches,
    isSearching,
    expandedTranscriptIds,
    performSearch,
    toggleExpanded,
  } = useGlobalSearchStore();

  // Local state for responsive typing (ephemeral)
  const [inputValue, setInputValue] = useState(q || "");

  // Debounced value triggers URL updates
  const debouncedQuery = useDebouncedValue(inputValue, 300);

  // Sync input from URL when navigating (URL is source of truth)
  useEffect(() => {
    setInputValue(q || "");
  }, [q]);

  // Update URL when debounced query changes (one-way flow: input → URL)
  useEffect(() => {
    if (debouncedQuery !== q) {
      replace(
        "global-search",
        debouncedQuery ? { q: debouncedQuery } : undefined,
      );
    }
  }, [debouncedQuery, q, replace]);

  // Perform search when URL query changes (URL → search)
  useEffect(() => {
    performSearch(q || "", transcripts);
  }, [q, transcripts, performSearch]);

  const handleClear = useCallback(() => {
    setInputValue("");
    // URL will be cleared by the debounce effect
  }, []);

  const handleBack = useCallback(() => {
    navigate("upload");
  }, [navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        handleClear();
      }
    },
    [handleClear],
  );

  const searchQuery = q || ""; // URL is source of truth
  const showResults = searchQuery.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-4">
          {/* Back Button + Search Input */}
          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex-shrink-0 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Back to upload"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search all transcripts..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-10 pl-10 text-base text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                autoFocus
                role="searchbox"
              />
              {inputValue && (
                <button
                  onClick={handleClear}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results Summary */}
          {showResults && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isSearching ? (
                <span>Searching...</span>
              ) : hasResults ? (
                <span>
                  Found in{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {results.length}
                  </span>{" "}
                  {results.length === 1 ? "conversation" : "conversations"}{" "}
                  (
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {totalMatches}
                  </span>{" "}
                  {totalMatches === 1 ? "match" : "matches"})
                </span>
              ) : (
                <span>No results found for &quot;{searchQuery}&quot;</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6">
          {!showResults ? (
            // Empty State - No Query
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Search Across All Transcripts
              </h2>
              <p className="max-w-md text-gray-600 dark:text-gray-400">
                Type a keyword or phrase to search through all your saved
                conversations
              </p>
            </div>
          ) : !hasResults ? (
            // Empty State - No Results
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                No Results Found
              </h2>
              <p className="max-w-md text-gray-600 dark:text-gray-400">
                We couldn&apos;t find any transcripts matching &quot;
                {searchQuery}&quot;. Try a different search term.
              </p>
            </div>
          ) : (
            // Results List
            <div className="space-y-0">
              {results.map((result) => (
                <GlobalSearchAccordion
                  key={result.transcriptId}
                  result={result}
                  isExpanded={expandedTranscriptIds.has(
                    result.transcriptId,
                  )}
                  onToggle={() => toggleExpanded(result.transcriptId)}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
