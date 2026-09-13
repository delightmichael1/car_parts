"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@heroui/react";
import { MdSearch, MdCheck } from "react-icons/md";
import { useAxios } from "@/hooks/useAxios";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Brand,
  OnlinePart,
  OnlinePartDetail,
  OnlineVehicleFit,
  Vehicle,
} from "@/types/types";

export type ChosenPart = {
  name: string;
  article: string;
  brandName: string;
  brandId: string;
  description: string;
  fitVehicleIds: string[];
};

const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "");

function matchVehicles(
  fitments: OnlineVehicleFit[],
  vehicles: Vehicle[],
): string[] {
  const ids: string[] = [];
  for (const vehicle of vehicles) {
    const vMake = normalize(vehicle.make);
    const vModel = normalize(vehicle.model);
    for (const fit of fitments) {
      const fMake = normalize(fit.make);
      const fModel = normalize(fit.model);
      if (vMake !== fMake) continue;
      if (
        fModel &&
        vModel !== fModel &&
        !vModel.includes(fModel) &&
        !fModel.includes(vModel)
      ) {
        continue;
      }
      if (fit.yearFrom && vehicle.yearTo && fit.yearFrom > vehicle.yearTo) {
        continue;
      }
      ids.push(vehicle.id);
      break;
    }
  }
  return ids;
}

export function OnlinePartSearch({
  brands,
  onBrandsRefreshed,
  onChosen,
}: {
  brands: Brand[];
  onBrandsRefreshed: () => void;
  onChosen: (part: ChosenPart) => void;
}) {
  const { secureAxios } = useAxios();
  const secureAxiosRef = useRef(secureAxios);
  useEffect(() => {
    secureAxiosRef.current = secureAxios;
  });

  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 350);
  const [results, setResults] = useState<OnlinePart[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [chosen, setChosen] = useState<ChosenPart | null>(null);

  useEffect(() => {
    const term = debounced.trim();
    if (term.length < 2) return;
    let cancelled = false;
    secureAxiosRef.current
      .get<{ parts: OnlinePart[] }>("/parts/search", { params: { q: term } })
      .then((response) => {
        if (!cancelled) setResults(response.data.parts ?? []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const resolveBrand = async (name: string): Promise<string> => {
    const existing = brands.find(
      (brand) => brand.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing.id;
    const { data } = await secureAxiosRef.current.post<{ brand: Brand }>(
      "/brands",
      { name },
    );
    onBrandsRefreshed();
    return data.brand.id;
  };

  const applyPart = async (part: OnlinePart) => {
    setIsResolving(true);
    try {
      const { data } = await secureAxiosRef.current.get<{
        part: OnlinePartDetail;
      }>("/parts/detail", { params: { article: part.article, mfi: part.mfi } });
      const detail = data.part ?? part;

      const [brandId, vehicles] = await Promise.all([
        resolveBrand(detail.brand || part.brand),
        secureAxiosRef.current
          .get<{ vehicles: Vehicle[] }>("/vehicles")
          .then((response) => response.data.vehicles)
          .catch(() => [] as Vehicle[]),
      ]);

      const fitVehicleIds = matchVehicles(detail.fitments ?? [], vehicles);
      const next: ChosenPart = {
        name: detail.description || part.description,
        article: detail.article || part.article,
        brandName: detail.brand || part.brand,
        brandId,
        description: detail.description || part.description,
        fitVehicleIds,
      };
      setChosen(next);
      onChosen(next);
    } catch {
      setResults([]);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4">
      <div className="flex items-center gap-2">
        <MdSearch className="h-4 w-4 text-secondary/45" />
        <p className="text-sm font-semibold text-secondary">
          Search parts online
        </p>
      </div>
      <Input
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (value.trim().length < 2) setResults([]);
          setIsSearching(value.trim().length >= 2);
        }}
        placeholder="Type a part number or name…"
        aria-label="Search parts online"
        variant="secondary"
        className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm text-secondary outline-none transition placeholder:text-secondary/40 focus:border-primary"
      />

      {chosen ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/10 px-3 py-2.5 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <MdCheck className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate font-medium text-secondary">
              {chosen.brandName} · {chosen.article} · {chosen.name}
            </span>
          </span>
          {chosen.fitVehicleIds.length > 0 ? (
            <span className="shrink-0 text-[11px] font-semibold text-secondary/60">
              {chosen.fitVehicleIds.length} fitment
              {chosen.fitVehicleIds.length === 1 ? "" : "s"} will be linked on
              save
            </span>
          ) : null}
        </div>
      ) : null}

      {isResolving ? (
        <p className="text-xs text-secondary/45">Fetching part details…</p>
      ) : isSearching ? (
        <p className="text-xs text-secondary/45">Searching…</p>
      ) : results.length === 0 ? (
        debounced.trim().length >= 2 ? (
          <p className="text-xs text-secondary/45">No parts found.</p>
        ) : null
      ) : (
        <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
          {results.map((part, index) => (
            <button
              key={`${part.mfi}-${part.article}-${index}`}
              type="button"
              onClick={() => applyPart(part)}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-black/5"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-secondary">
                  {part.brand} · {part.article}
                </span>
                <span className="block truncate text-[11px] text-secondary/45">
                  {part.description}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-primary">
                Use
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}