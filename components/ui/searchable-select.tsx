"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
}

export function SearchableSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  emptyText = "No results found",
  disabled = false,
  className,
  allowClear = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const filteredOptions = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, query]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors",
            "hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
            className
          )}
        >
          <span className="truncate text-left flex-1">
            {selectedOption ? (
              <span className="font-medium text-gray-900">{selectedOption.label}</span>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </span>

          <div className="flex items-center gap-1 ml-2 shrink-0">
            {allowClear && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("");
                }}
                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 text-gray-400 opacity-60" />
          </div>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            "z-50 w-[var(--radix-popover-trigger-width)] min-w-[240px] max-w-[420px] rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 animate-in overflow-hidden",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          )}
        >
          {/* Search Input Box */}
          <div className="flex items-center border-b border-gray-200 px-3 py-2 bg-gray-50/70">
            <Search className="h-4 w-4 shrink-0 text-gray-400 mr-2" />
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600 text-xs p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Option List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-gray-50">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                      isSelected
                        ? "bg-blue-50 text-blue-900 font-semibold"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="text-xs font-normal text-gray-500 truncate">
                          {opt.description}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
