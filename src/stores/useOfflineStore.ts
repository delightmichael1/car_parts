import { create } from "zustand";

type OfflineState = {
  isOnline: boolean;
  queueLength: number;
  setOnline: (online: boolean) => void;
  setQueueLength: (length: number) => void;
};

const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  queueLength: 0,
  setOnline: (online) => set({ isOnline: online }),
  setQueueLength: (length) => set({ queueLength: length }),
}));

export default useOfflineStore;
