"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface BaseProps {
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string | null | undefined;
  onChange: (value: string) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

export type ComboboxProps = SingleProps | MultiProps;

/**
 * A searchable dropdown built on Radix Popover. Supports both single-value
 * and multi-value modes via the `multiple` flag. Designed to feel at home
 * next to the existing shadcn `Select` while adding instant filtering.
 */
export function Combobox(props: ComboboxProps) {
  const {
    options,
    placeholder = "Choose…",
    emptyText = "No matches",
    searchPlaceholder = "Search…",
    disabled,
    className,
  } = props;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const isSelected = (v: string) => {
    if (props.multiple) return props.value?.includes(v);
    return props.value === v;
  };

  function pick(v: string) {
    if (props.multiple) {
      const next = props.value?.includes(v)
        ? props.value.filter((x) => x !== v)
        : [...(props.value ?? []), v];
      props.onChange(next);
    } else {
      props.onChange(v);
      setOpen(false);
    }
  }

  const triggerLabel = React.useMemo(() => {
    if (props.multiple) {
      const list = props.value ?? [];
      if (list.length === 0) return placeholder;
      const labels = list
        .map((v) => options.find((o) => o.value === v)?.label ?? v);
      return labels.join(", ");
    }
    if (!props.value) return placeholder;
    return options.find((o) => o.value === props.value)?.label ?? props.value;
  }, [props, options, placeholder]);

  const isEmpty = props.multiple
    ? (props.value ?? []).length === 0
    : !props.value;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3.5 py-2 text-left text-sm ring-offset-background transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          {props.multiple && (props.value?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {props.value!.slice(0, 3).map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <Badge key={v} variant="secondary" className="gap-1 py-0">
                    {opt?.label ?? v}
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (props.multiple) {
                          props.onChange(
                            (props.value ?? []).filter((x) => x !== v),
                          );
                        }
                      }}
                      className="-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-foreground/10"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                );
              })}
              {props.value!.length > 3 && (
                <Badge variant="secondary" className="py-0">
                  +{props.value!.length - 3}
                </Badge>
              )}
            </div>
          ) : (
            <span
              className={cn(
                "line-clamp-1 truncate",
                isEmpty && "text-muted-foreground",
              )}
            >
              {triggerLabel}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul role="listbox" className="max-h-64 overflow-auto p-1">
          {filtered.length === 0 && (
            <li className="px-3 py-3 text-center text-sm text-muted-foreground">
              {emptyText}
            </li>
          )}
          {filtered.map((o) => {
            const selected = isSelected(o.value);
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-accent hover:text-accent-foreground",
                    selected && "bg-accent/60",
                  )}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {selected && <Check className="h-4 w-4" />}
                  </span>
                  <span className="flex-1 truncate">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
