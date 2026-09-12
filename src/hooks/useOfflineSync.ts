import { useCallback, useEffect } from "react";
import { useAxios } from "./useAxios";
import { toast } from "@heroui/react";
import useOfflineStore from "@/stores/useOfflineStore";
import { getOfflineQueue, removeOfflineRequests } from "@/lib/offlineQueue";

/**
 * Replays the offline mutation queue when connectivity returns. Listens for
 * window online/offline events, replays queued requests in order on reconnect
 * and on mount (if already online), and keeps the offline store in sync.
 */
export const useOfflineSync = () => {
  const { secureAxios } = useAxios();
  const setOnline = useOfflineStore((s) => s.setOnline);
  const setQueueLength = useOfflineStore((s) => s.setQueueLength);
  const isOnline = useOfflineStore((s) => s.isOnline);

  const refreshQueueLength = useCallback(async () => {
    setQueueLength((await getOfflineQueue()).length);
  }, [setQueueLength]);

  const syncQueue = useCallback(async () => {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    const syncedIds: string[] = [];
    for (const req of queue) {
      try {
        await secureAxios({ method: req.method, url: req.url, data: req.data });
        syncedIds.push(req.id);
      } catch {
        // Stop on the first failure (server rejects a stale change or is
        // still unreachable); the rest will retry on the next online event.
        break;
      }
    }

    if (syncedIds.length > 0) {
      await removeOfflineRequests(syncedIds);
      await refreshQueueLength();
      toast.success("Changes synced", {
        description: `${syncedIds.length} offline change${
          syncedIds.length > 1 ? "s" : ""
        } synced to the server.`,
      });
    }
  }, [refreshQueueLength]);

  // Offline → online transition (from a socket reconnect, a browser online
  // event, or a successful request) replays any queued changes.
  useEffect(() => {
    if (isOnline) syncQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  useEffect(() => {
    // The socket is the source of truth for coming back online (see
    // useSocketState). Browser "online" only means the OS network returned —
    // it does NOT prove the server is reachable, so it must never flip the
    // store online. It can still trigger a sync attempt.
    const onOnline = () => syncQueue();
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    refreshQueueLength();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnline, syncQueue, refreshQueueLength]);

  return { syncQueue, refreshQueueLength };
};
