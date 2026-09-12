"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@heroui/react";
import { MdCheck, MdClose } from "react-icons/md";
import { useAxios } from "@/hooks/useAxios";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Product, ProductsResponse } from "@/types/types";

const RESULT_LIMIT = 10;

/**
 * Searchable product picker backed by the server. Shows the 10 most recent
 * products when the field is empty and runs a debounced `?search=` against the
 * database as the user types — safe for catalogs of a million+ parts.
 */
export function AsyncProductSelect({
  value,
  onChange,
  placeholder = "Search products…",
  exclude,
  autoClear = false,
  className,
}: {
  value: string;
  onChange: (productId: string, product: Product | null) => void;
  placeholder?: string;
  exclude?: Set<string>;
  /** Clear the field after a pick so the next product can be chosen. */
  autoClear?: boolean;
  className?: string;
}) {
  const { secureAxios } = useAxios();
  const secureAxiosRef = useRef(secureAxios);
  useEffect(() => {
    secureAxiosRef.current = secureAxios;
  });

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    let cancelled = false;
    secureAxiosRef.current
      .get<ProductsResponse>("/products", {
        params: {
          page: 1,
          limit: RESULT_LIMIT,
          active: true,
          search: debouncedQuery || undefined,
        },
      })
      .then((response) => {
        if (cancelled) return;
        const items =
          exclude && exclude.size
            ? response.data.products.filter((product) => !exclude.has(product.id))
            : response.data.products;
        setResults(items);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, exclude]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen]);

  const pick = (product: Product) => {
    setSelected(product);
    setQuery(product.name);
    setIsOpen(false);
    onChange(product.id, product);
    if (autoClear) {
      setSelected(null);
      setQuery("");
    }
  };

  const clear = () => {
    setSelected(null);
    setQuery("");
    setIsOpen(false);
    onChange("", null);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "Enter" && isOpen && results.length > 0) {
      event.preventDefault();
      pick(results[0]);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          variant="secondary"
          className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 pr-10 text-sm text-secondary outline-none transition placeholder:text-secondary/40 focus:border-primary"
        />
        {selected ? (
          <button
            type="button"
            aria-label="Clear selection"
            onMouseDown={(event) => {
              event.preventDefault();
              clear();
            }}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-secondary/50 transition hover:bg-black/5"
          >
            <MdClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_20px_60px_rgba(8,15,23,0.18)]">
          {isLoading ? (
            <p className="px-3 py-3 text-xs text-secondary/45">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-secondary/45">
              No products found{query ? ` for "${query}"` : ""}.
            </p>
          ) : (
            <div className="flex max-h-72 flex-col overflow-y-auto">
              {results.map((product) => {
                const isSelected = product.id === value;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      pick(product);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      isSelected
                        ? "bg-primary/15 text-secondary"
                        : "text-secondary hover:bg-black/5"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {product.name}
                      </span>
                      <span className="block truncate text-[11px] text-secondary/45">
                        {product.sku}
                        {product.quantity <= 0
                          ? " · out of stock"
                          : ` · ${product.quantity} in stock`}
                      </span>
                    </span>
                    {isSelected ? (
                      <MdCheck className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}