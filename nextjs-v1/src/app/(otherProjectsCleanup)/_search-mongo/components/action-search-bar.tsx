"use client";

import { useState, useEffect, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Send,
  BarChart2,
  Globe,
  Video,
  PlaneTakeoff,
  AudioLines,
} from "lucide-react";
import { mongoSearchApi } from "@/app/(otherProjectsCleanup)/_search-mongo/utils/api";

function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

type Action = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  short?: string;
  end?: string;
};

type SearchResult = {
  actions: Action[];
};

const allActions = [
  {
    id: "1",
    label: "Using Vector Search",
    icon: <PlaneTakeoff className="h-4 w-4 text-blue-500" />,
    description: "Operator",
    short: "⌘K",
    end: "Agent",
  },
  {
    id: "2",
    label: "When you actually submit",
    icon: <BarChart2 className="h-4 w-4 text-orange-500" />,
    description: "the form",
    short: "⌘cmd+p",
    end: "Command",
  },
  {
    id: "3",
    label: "Using Keywords Search",
    icon: <Video className="h-4 w-4 text-purple-500" />,
    description: "gpt-4o",
    short: "",
    end: "Application",
  },
  {
    id: "4",
    label: "When Autocompleting",
    icon: <AudioLines className="h-4 w-4 text-green-500" />,
    description: "gpt-4o voice",
    short: "",
    end: "Active",
  },
  {
    id: "5",
    label: "with Fuzzy matching",
    icon: <Globe className="h-4 w-4 text-blue-500" />,
    description: "gpt-4o",
    short: "",
    end: "Command",
  },
];

function ActionSearchBar({
  actions = allActions,
}: {
  actions?: Action[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [inputValue, setInputValue] = useState(query);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAction, setSelectedAction] = useState<Action | null>(
    null,
  );
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<
    Action[]
  >([]);
  const debouncedInputValue = useDebounce(inputValue, 400);

  // Update URL when query changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [query, router, searchParams]);

  // Fetch autocomplete suggestions when debouncedInputValue changes
  useEffect(() => {
    if (!isFocused || !debouncedInputValue) {
      setAutocompleteSuggestions([]);
      setResult({ actions: allActions });
      return;
    }

    const fetchAutocompleteSuggestions = async () => {
      try {
        // Example of fetching from API - you can uncomment this when the API is ready
        // const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(debouncedInputValue)}`);
        // const data = await response.json();
        // setAutocompleteSuggestions(data.actions);
        const response = await mongoSearchApi.getAutocompleteSuggestions(
          debouncedInputValue,
        );
        // map the strings[] to be an action[] (for now use dummy data)
        const filteredActions = response.map((suggestion) => ({
          id: suggestion,
          label: suggestion,
          icon: (
            <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          ),
          description: "gpt-4o",
          short: "",
          end: "Command",
        }));
        setAutocompleteSuggestions(filteredActions);
        setResult({ actions: filteredActions });

        // // For now, we'll filter the allActions as a placeholder
        // const normalizedQuery = debouncedInputValue.toLowerCase().trim();
        // const filteredActions = allActions.filter((action) => {
        // 	const searchableText = action.label.toLowerCase();
        // 	return searchableText.includes(normalizedQuery);
        // });

        // setAutocompleteSuggestions(filteredActions);
        // setResult({ actions: filteredActions });
      } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
        // Fallback to local filtering if API fails
        const normalizedQuery = debouncedInputValue.toLowerCase().trim();
        const filteredActions = allActions.filter((action) => {
          const searchableText = action.label.toLowerCase();
          return searchableText.includes(normalizedQuery);
        });

        setAutocompleteSuggestions(filteredActions);
        setResult({ actions: filteredActions });
      }
    };

    fetchAutocompleteSuggestions();
  }, [debouncedInputValue, isFocused]);

  // When user types in the input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsTyping(true);
  };

  // When user submits the form (presses enter or clicks send)
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(inputValue);
    setIsTyping(false);
  };

  // Reset selectedAction when focusing the input
  const handleFocus = () => {
    setSelectedAction(null);
    setIsFocused(true);
  };

  // Handle keydown for enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setQuery(inputValue);
      setIsTyping(false);
    } else if (e.key === "Escape") {
      setIsFocused(false);
      setAutocompleteSuggestions([]);
      setResult(null);
    } else {
      setIsFocused(true);
    }
  };

  const container = {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: {
        height: {
          duration: 0.4,
        },
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        height: {
          duration: 0.3,
        },
        opacity: {
          duration: 0.2,
        },
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="relative flex flex-col items-center justify-start">
        <div className="bg-background sticky top-0 z-10 w-full max-w-sm pt-4 pb-1">
          <label
            className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
            htmlFor="search"
          >
            Search Commands
          </label>
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Input
                type="text"
                placeholder="John Due salary's agreement"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                className="h-9 rounded-lg py-1.5 pr-9 pl-3 text-sm focus-visible:ring-offset-0"
              />
              <button
                type="submit"
                className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 cursor-pointer"
              >
                <AnimatePresence mode="popLayout">
                  {inputValue.length > 0 ? (
                    <motion.div
                      key="send"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Send className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="search"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </form>
        </div>

        <div className="w-full max-w-sm">
          <AnimatePresence>
            {isFocused && result && !selectedAction && (
              <motion.div
                className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-sm dark:border-gray-800 dark:bg-black"
                variants={container}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <motion.ul>
                  {result.actions.length > 0 ? (
                    result.actions.map((action) => (
                      <motion.li
                        key={action.id}
                        className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 hover:bg-gray-200 dark:hover:bg-zinc-900"
                        variants={item}
                        layout
                        onClick={() => {
                          setSelectedAction(action);
                          setInputValue(action.label);
                          setQuery(action.label);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">
                              {action.icon}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {action.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {action.description}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {action.short}
                          </span>
                          <span className="text-right text-xs text-gray-400">
                            {action.end}
                          </span>
                        </div>
                      </motion.li>
                    ))
                  ) : (
                    <motion.li
                      className="px-3 py-2 text-sm text-gray-400"
                      variants={item}
                    >
                      No results found
                    </motion.li>
                  )}
                </motion.ul>
                <div className="mt-2 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Press ⌘K to open commands</span>
                    <span>ESC to cancel</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export { ActionSearchBar };
export type { Action, SearchResult };
