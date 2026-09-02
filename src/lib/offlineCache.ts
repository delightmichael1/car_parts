import { Preferences } from "@capacitor/preferences";

type CacheEntry = {
  data: unknown;
  ts: number;
};

type CacheMap = Record<string, CacheEntry>;

const CACHE_KEY = "hl_get_cache";
const MAX_ENTRIES = 60;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 2 * 1024 * 1024;

const read = async (): Promise<CacheMap> => {
  try {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    return value ? (JSON.parse(value) as CacheMap) : {};
  } catch {
    return {};
  }
};

const write = async (map: CacheMap): Promise<void> => {
  try {
    let serialized = JSON.stringify(map);
    if (serialized.length > MAX_BYTES) {
      const oldest = Object.entries(map).sort((a, b) => a[1].ts - b[1].ts);
      for (const [key] of oldest) {
        delete map[key];
        serialized = JSON.stringify(map);
        if (serialized.length <= MAX_BYTES) break;
      }
    }
    await Preferences.set({ key: CACHE_KEY, value: serialized });
  } catch {
    // cache persistence is best-effort
  }
};

/**
 * Caches a successful GET response for offline fallback. LRU-bounded by
 * entry count and total size; entries expire after MAX_AGE_MS.
 */
export const cacheGetResponse = async (
  key: string,
  data: unknown,
): Promise<void> => {
  const map = await read();
  map[key] = { data, ts: Date.now() };
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    const drop = keys
      .sort((a, b) => map[a].ts - map[b].ts)
      .slice(0, keys.length - MAX_ENTRIES);
    for (const k of drop) delete map[k];
  }
  await write(map);
};

/** Returns a cached GET response for `key`, or null when missing/expired. */
export const getCachedResponse = async (
  key: string,
): Promise<unknown | null> => {
  const map = await read();
  const entry = map[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > MAX_AGE_MS) return null;
  return entry.data;
};