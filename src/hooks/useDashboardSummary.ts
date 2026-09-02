"use client";

import { useAxios } from "@/hooks/useAxios";
import { DashboardSummary } from "@/types/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface DashboardSummaryResponse {
  summary: DashboardSummary;
  message: string;
}

export function useDashboardSummary() {
  const { secureAxios } = useAxios();
  const secureAxiosRef = useRef(secureAxios);
  secureAxiosRef.current = secureAxios;

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } =
        await secureAxiosRef.current.get<DashboardSummaryResponse>(
          "/dashboard/summary",
        );
      setSummary(data.summary);
    } catch {
      setError("We couldn't load your dashboard right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, isLoading, error, refetch: fetchSummary };
}
