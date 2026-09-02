import { Preferences } from "@capacitor/preferences";

export type QueuedMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type QueuedRequest = {
  id: string;
  method: QueuedMethod;
  url: string;
  data?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
};

const QUEUE_KEY = "hl_offline_queue";

const readQueue = async (): Promise<QueuedRequest[]> => {
  try {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    return value ? (JSON.parse(value) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = async (queue: QueuedRequest[]): Promise<void> => {
  try {
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) });
  } catch {
    // Persistence failure is non-fatal: the request just won't survive a restart.
  }
};

export const enqueueOfflineRequest = async (
  req: Omit<QueuedRequest, "id" | "createdAt">,
): Promise<void> => {
  const queue = await readQueue();
  queue.push({ ...req, id: crypto.randomUUID(), createdAt: Date.now() });
  await writeQueue(queue);
};

export const getOfflineQueue = async (): Promise<QueuedRequest[]> => {
  return readQueue();
};

export const removeOfflineRequests = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const queue = await readQueue();
  await writeQueue(queue.filter((r) => !ids.includes(r.id)));
};

export const clearOfflineQueue = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: QUEUE_KEY });
  } catch {
    // ignore
  }
};
