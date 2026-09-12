import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import useOfflineStore from "@/stores/useOfflineStore";
import { BiWifiOff } from "react-icons/bi";
import { FiCloudOff, FiRefreshCw } from "react-icons/fi";

/**
 * Shows a fixed banner when the device loses connectivity (cached data is
 * being shown / changes are queued) or when queued offline changes are still
 * waiting to sync.
 */
export default function OfflineBanner({ onSync }: { onSync?: () => void }) {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const queueLength = useOfflineStore((s) => s.queueLength);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  // The store seeds isOnline from navigator.onLine, which is undefined during
  // SSR — so the banner would render differently on the server vs the client
  // and break hydration. Render nothing until mounted.
  if (!mounted) return null;

  if (isOnline && queueLength === 0) return null;

  const offline = !isOnline;

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-60 px-4 py-1 flex items-center justify-between gap-3 text-xs ${
        offline ? "bg-red-600 text-white" : "bg-amber-400 text-black"
      }`}
      role="status"
    >
      <div className="flex items-center gap-2 min-w-0">
        {offline ? (
          <BiWifiOff className="w-4 h-4 shrink-0" />
        ) : (
          <FiCloudOff className="w-4 h-4 shrink-0" />
        )}
        <p className="truncate">
          {offline
            ? "You're offline — showing saved data. Changes are queued and will sync automatically."
            : `${queueLength} offline change${
                queueLength > 1 ? "s" : ""
              } waiting to sync.`}
        </p>
      </div>
      {!offline && queueLength > 0 && (
        <Button
          size="sm"
          className="bg-black text-white shrink-0"
          onPress={onSync}
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          <span>Sync now</span>
        </Button>
      )}
    </div>
  );
}
