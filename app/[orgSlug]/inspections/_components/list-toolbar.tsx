"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowDownAZ, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/components/i18n-provider";

interface ChipDef {
  id: string;
  label: string;
}

interface Props {
  q: string;
  status: string;
  sort: string;
  chips: ChipDef[];
}

/**
 * Sticky, glassy filter bar. State lives in URL search params so the page is
 * a server component that re-renders on each change.
 */
export function ListToolbar({ q, status, sort, chips }: Props) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = React.useState(q);
  React.useEffect(() => {
    setSearchValue(q);
  }, [q]);

  // Debounce search input so we don't navigate on every keystroke.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (searchValue.trim() === q.trim()) return;
      pushParams({ q: searchValue.trim() || null });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function pushParams(updates: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setStatus(s: string) {
    pushParams({ status: s === "all" ? null : s });
  }

  function setSort(s: string) {
    pushParams({ sort: s === "due" ? null : s });
  }

  const sortLabel = (() => {
    switch (sort) {
      case "recent":
        return t("modules.inspections.filter.sortRecent");
      case "alpha":
        return t("modules.inspections.filter.sortAlpha");
      case "due":
      default:
        return t("modules.inspections.filter.sortDue");
    }
  })();

  const hasFilters = q.length > 0 || (status && status !== "all") || sort !== "due";

  return (
    <div className="space-y-2 lg:sticky lg:top-16 lg:z-20 lg:rounded-2xl lg:border lg:bg-background/85 lg:px-3 lg:py-2 lg:backdrop-blur">
      {/* Search + sort + clear (single row, always) */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t("modules.inspections.filter.searchPlaceholder")}
            className="h-9 pl-9 pr-8 text-sm"
          />
          {searchValue.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchValue("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 px-2.5">
              <ArrowDownAZ className="h-4 w-4" />
              <span className="hidden md:inline">{sortLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setSort("due")}>
              {t("modules.inspections.filter.sortDue")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSort("recent")}>
              {t("modules.inspections.filter.sortRecent")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSort("alpha")}>
              {t("modules.inspections.filter.sortAlpha")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-2.5 text-muted-foreground"
            onClick={() => {
              setSearchValue("");
              pushParams({ q: null, status: null, sort: null });
            }}
            aria-label={t("modules.inspections.filter.clear")}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden md:inline">
              {t("modules.inspections.filter.clear")}
            </span>
          </Button>
        )}
      </div>

      {/* Status chips */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        {chips.map((c) => {
          const active = (status || "all") === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setStatus(c.id)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium transition sm:px-3 sm:text-xs",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-accent",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
