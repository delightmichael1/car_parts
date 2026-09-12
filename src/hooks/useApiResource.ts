"use client";

import { useAxios } from "@/hooks/useAxios";
import useDeviceStore from "@/stores/useDeviceStore";
import { AxiosInstance } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic data-fetching hook for the authenticated axios instance. Mirrors the
 * behaviour of useDashboardSummary: a GET round-trip that falls back to the
 * offline cache automatically (see useAxios), with loading/error/refetch state
 * for the page to render.
 *
 * Pass a `key` to re-run the fetch whenever it changes (e.g. a search term).
 * The current key is forwarded to the fetcher as its second argument.
 */
export function useApiResource<T>(
  fetcher: (client: AxiosInstance, key: unknown) => Promise<T>,
  onError?: (error: unknown) => string,
  key?: unknown,
) {
  const { secureAxios } = useAxios();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deviceId = useDeviceStore((state) => state.device?.id);

  const secureAxiosRef = useRef(secureAxios);
  const fetcherRef = useRef(fetcher);
  const onErrorRef = useRef(onError);
  const keyRef = useRef(key);

  // Refs must not be written during render, so they are kept in sync inside
  // effects. Order matters: key is refreshed before the load effect reads it.
  useEffect(() => {
    secureAxiosRef.current = secureAxios;
  }, [secureAxios]);

  useEffect(() => {
    fetcherRef.current = fetcher;
    onErrorRef.current = onError;
  }, [fetcher, onError]);

  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  const load = useCallback(async () => {
    try {
      const result = await fetcherRef.current(
        secureAxiosRef.current,
        keyRef.current,
      );
      setData(result);
    } catch (err) {
      setError(
        onErrorRef.current?.(err) ??
          "We couldn't load this data right now. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (deviceId) load();
  }, [load, key, deviceId]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await load();
  }, [load]);

  return { data, isLoading, error, refetch };
}
